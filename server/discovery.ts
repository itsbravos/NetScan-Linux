import { execFile } from "child_process";
import { promisify } from "util";
import dns from "dns";
import fs from "fs";
import {
  enumerateIPv4Hosts,
  isIPv4InCidr,
  mapWithConcurrency,
  normalizeIPv4Cidr,
  probePort,
} from "./netUtils";
import { lookupVendor } from "./ouiLookup";

const execFileAsync = promisify(execFile);

const PING_TIMEOUT_SEC = 1;
const PING_CONCURRENCY = 32;
const DEVICE_CONCURRENCY = 16;
const REVERSE_DNS_TIMEOUT_MS = 800;
const COMMON_PORTS_TO_PROBE = [21, 22, 23, 53, 80, 139, 443, 445, 3389, 8080];
const PORT_PROBE_TIMEOUT_MS = 300;
const PING_HISTORY_SAMPLES = 10;

export interface DiscoveredDevice {
  ip: string;
  ipv6: string[];
  mac: string;
  hostname: string;
  vendor: string;
  deviceType: string;
  status: "online" | "offline";
  latencyMs: number; // -1 = respondeu ARP/NDP mas não respondeu ICMP
  pingHistory: number[];
  ports: number[];
}

interface NeighEntry {
  ip: string;
  mac: string;
  state: string;
}

function isUsableNeighState(state: string): boolean {
  return !["FAILED", "INCOMPLETE", "NONE"].includes(state.toUpperCase());
}

// --- Ping sweep --------------------------------------------------------

async function pingHost(ip: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ping",
      ["-c", "1", "-W", String(PING_TIMEOUT_SEC), ip],
      { timeout: (PING_TIMEOUT_SEC + 1) * 1000 }
    );
    const match = /time[=<]([\d.]+)\s*ms/.exec(stdout);
    return match ? Number(match[1]) : 0;
  } catch {
    return null;
  }
}

async function pingSweep(hosts: string[]): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();
  await mapWithConcurrency(hosts, PING_CONCURRENCY, async (ip) => {
    results.set(ip, await pingHost(ip));
  });
  return results;
}

// Fires a few extra pings so the UI's ping-history sparkline shows real
// variance instead of falling back to synthetic data (which only kicks in
// when fewer than 10 samples are provided).
async function buildPingHistory(ip: string, firstSampleMs: number): Promise<number[]> {
  const extra = await mapWithConcurrency(
    Array.from({ length: PING_HISTORY_SAMPLES - 1 }),
    PING_HISTORY_SAMPLES - 1,
    () => pingHost(ip)
  );

  let lastGood = firstSampleMs;
  return [firstSampleMs, ...extra].map((v) => {
    if (v !== null) {
      lastGood = v;
      return Math.round(v);
    }
    return Math.round(lastGood);
  });
}

// --- ARP / NDP table reading --------------------------------------------

function parseIpNeighOutput(output: string): NeighEntry[] {
  const entries: NeighEntry[] = [];
  for (const line of output.split("\n")) {
    const match = /^(\S+)\s+dev\s+(\S+)(?:\s+lladdr\s+(\S+))?\s+(\S+)\s*$/.exec(line.trim());
    if (!match) continue;
    const [, ip, , mac, state] = match;
    if (!mac) continue;
    entries.push({ ip, mac: mac.toLowerCase(), state });
  }
  return entries;
}

function parseProcNetArp(content: string): NeighEntry[] {
  const entries: NeighEntry[] = [];
  for (const line of content.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [ip, , flags, mac] = parts;
    if (!mac || mac === "00:00:00:00:00:00") continue;
    entries.push({ ip, mac: mac.toLowerCase(), state: flags === "0x2" ? "REACHABLE" : "INCOMPLETE" });
  }
  return entries;
}

async function readIPv4NeighTable(): Promise<NeighEntry[]> {
  try {
    const { stdout } = await execFileAsync("ip", ["-4", "neigh", "show"]);
    return parseIpNeighOutput(stdout);
  } catch {
    try {
      return parseProcNetArp(fs.readFileSync("/proc/net/arp", "utf-8"));
    } catch {
      return [];
    }
  }
}

async function readIPv6NeighTable(iface: string): Promise<NeighEntry[]> {
  try {
    // Best-effort: wake up neighbors on the link (multicast all-nodes) so the
    // kernel's NDP cache has fresh entries. Failures (e.g. no IPv6 on this
    // link) are ignored — IPv6 discovery is inherently best-effort.
    await execFileAsync("ping", ["-6", "-c", "2", "-W", "1", "-I", iface, "ff02::1"], {
      timeout: 4000,
    }).catch(() => {});
    const { stdout } = await execFileAsync("ip", ["-6", "neigh", "show", "dev", iface]);
    return parseIpNeighOutput(stdout);
  } catch {
    return [];
  }
}

async function getDefaultGateway(): Promise<{ ip: string | null; iface: string | null }> {
  try {
    const { stdout } = await execFileAsync("ip", ["route", "show", "default"]);
    const match = /default via (\S+) dev (\S+)/.exec(stdout);
    if (match) return { ip: match[1], iface: match[2] };
  } catch {
    // ignore — no default route available
  }
  return { ip: null, iface: null };
}

// --- Hostname / vendor / classification ---------------------------------

async function reverseDnsLookup(ip: string): Promise<string> {
  try {
    const names = await Promise.race([
      dns.promises.reverse(ip),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), REVERSE_DNS_TIMEOUT_MS)
      ),
    ]);
    return names[0] || ip;
  } catch {
    return ip;
  }
}

function classifyDeviceType(vendor: string, isGateway: boolean): string {
  if (isGateway) return "router";
  const v = vendor.toLowerCase();
  if (/(raspberry|espressif|sonos|nest|belkin|edimax)/.test(v)) return "iot";
  if (/(hikvision|dahua)/.test(v)) return "camera";
  if (/(canon|epson|brother)/.test(v)) return "printer";
  if (/(tp-link|d-link|netgear|ubiquiti|mikrotik|cisco)/.test(v)) return "router";
  if (/(apple|samsung|xiaomi|huawei|oppo|oneplus)/.test(v)) return "mobile";
  if (/(vizio|roku|lg electronics|tcl)/.test(v)) return "smart_tv";
  if (/(dell|hewlett|hp inc|intel)/.test(v)) return "desktop";
  if (/(vmware|virtualbox|qemu|kvm|hyper-v|parallels)/.test(v)) return "server";
  return "unknown";
}

// --- Main discovery orchestration ----------------------------------------

export interface DiscoverOptions {
  includeIpv6?: boolean;
  probeCommonPorts?: boolean;
}

export async function discoverDevices(
  targetSubnet: string,
  options: DiscoverOptions = {}
): Promise<DiscoveredDevice[]> {
  const normalizedCidr = normalizeIPv4Cidr(targetSubnet);
  if (!normalizedCidr) {
    throw new Error("Subnet inválida. Use o formato CIDR, ex: 192.168.1.0/24");
  }

  const hosts = enumerateIPv4Hosts(normalizedCidr);
  if (!hosts) {
    throw new Error(
      "Subnet muito grande para varredura (máximo /22, 1024 endereços). Reduza o range."
    );
  }

  const [pingResults, gateway] = await Promise.all([pingSweep(hosts), getDefaultGateway()]);

  const neighEntries = await readIPv4NeighTable();
  const neighByIp = new Map<string, NeighEntry>();
  for (const entry of neighEntries) {
    if (isUsableNeighState(entry.state) && isIPv4InCidr(entry.ip, normalizedCidr)) {
      neighByIp.set(entry.ip, entry);
    }
  }

  const devices: DiscoveredDevice[] = [];

  await mapWithConcurrency(Array.from(neighByIp.keys()), DEVICE_CONCURRENCY, async (ip) => {
    const neigh = neighByIp.get(ip)!;
    const mac = neigh.mac;
    const rtt = pingResults.get(ip) ?? null;
    const vendor = lookupVendor(mac);
    const isGateway = gateway.ip === ip;
    const hostname = await reverseDnsLookup(ip);

    let ports: number[] = [];
    if (options.probeCommonPorts !== false) {
      const openFlags = await mapWithConcurrency(COMMON_PORTS_TO_PROBE, 5, async (port) =>
        (await probePort(ip, port, PORT_PROBE_TIMEOUT_MS)) ? port : null
      );
      ports = openFlags.filter((p): p is number => p !== null);
    }

    const pingHistory = rtt !== null ? await buildPingHistory(ip, rtt) : [];

    devices.push({
      ip,
      ipv6: [],
      mac,
      hostname,
      vendor,
      deviceType: classifyDeviceType(vendor, isGateway),
      status: "online",
      latencyMs: rtt !== null ? Math.round(rtt) : -1,
      pingHistory,
      ports,
    });
  });

  if (options.includeIpv6 && gateway.iface) {
    const ipv6Entries = await readIPv6NeighTable(gateway.iface);
    for (const entry of ipv6Entries) {
      if (!isUsableNeighState(entry.state)) continue;
      if (entry.ip.startsWith("ff") || entry.ip === "::") continue; // skip multicast

      const existing = devices.find((d) => d.mac === entry.mac);
      if (existing) {
        if (!existing.ipv6.includes(entry.ip)) existing.ipv6.push(entry.ip);
      } else {
        const vendor = lookupVendor(entry.mac);
        devices.push({
          ip: "",
          ipv6: [entry.ip],
          mac: entry.mac,
          hostname: entry.ip,
          vendor,
          deviceType: classifyDeviceType(vendor, false),
          status: "online",
          latencyMs: -1,
          pingHistory: [],
          ports: [],
        });
      }
    }
  }

  return devices;
}
