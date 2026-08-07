import net from "net";

// Check whether a single TCP port on a target IP is open (real socket probe)
export function probePort(ip: string, port: number, timeout = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      status = true;
      socket.destroy();
    });

    socket.on("timeout", () => {
      socket.destroy();
    });

    socket.on("error", () => {
      socket.destroy();
    });

    socket.on("close", () => {
      resolve(status);
    });

    socket.connect(port, ip);
  });
}

function ipv4ToLong(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function longToIpv4(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export interface ParsedIPv4Cidr {
  network: number;
  prefixLength: number;
  hostCount: number;
}

// Parses a plain "a.b.c.d/nn" IPv4 CIDR string. Returns null if malformed.
export function parseIPv4Cidr(cidr: string): ParsedIPv4Cidr | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(cidr.trim());
  if (!match) return null;

  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return null;

  const prefixLength = Number(match[5]);
  if (prefixLength < 0 || prefixLength > 32) return null;

  const ipLong = ipv4ToLong(octets.join("."));
  const hostBits = 32 - prefixLength;
  const mask = hostBits === 32 ? 0 : (~0 << hostBits) >>> 0;
  const network = (ipLong & mask) >>> 0;
  const hostCount = hostBits >= 31 ? 2 ** hostBits : Math.max(2 ** hostBits - 2, 0);

  return { network, prefixLength, hostCount };
}

export function normalizeIPv4Cidr(cidr: string): string | null {
  const parsed = parseIPv4Cidr(cidr);
  if (!parsed) return null;
  return `${longToIpv4(parsed.network)}/${parsed.prefixLength}`;
}

// Any /22 or smaller (<=1024 addresses) is allowed, to keep the ping sweep bounded.
export const MAX_SCAN_HOSTS = 1024;

// Enumerates usable host addresses in a CIDR block (excludes network/broadcast
// for masks smaller than /31). Returns null if the CIDR is invalid or exceeds
// MAX_SCAN_HOSTS.
export function enumerateIPv4Hosts(cidr: string, maxHosts = MAX_SCAN_HOSTS): string[] | null {
  const parsed = parseIPv4Cidr(cidr);
  if (!parsed) return null;
  if (parsed.hostCount > maxHosts) return null;

  const hostBits = 32 - parsed.prefixLength;
  if (hostBits === 0) {
    return [longToIpv4(parsed.network)];
  }

  const total = 2 ** hostBits;
  const start = hostBits >= 31 ? 0 : 1;
  const end = hostBits >= 31 ? total : total - 1;

  const hosts: string[] = [];
  for (let i = start; i < end; i++) {
    hosts.push(longToIpv4((parsed.network + i) >>> 0));
  }
  return hosts;
}

export function isIPv4InCidr(ip: string, cidr: string): boolean {
  const parsed = parseIPv4Cidr(cidr);
  if (!parsed) return false;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return false;

  const hostBits = 32 - parsed.prefixLength;
  const mask = hostBits === 32 ? 0 : (~0 << hostBits) >>> 0;
  const ipLong = ipv4ToLong(octets.join("."));
  return ((ipLong & mask) >>> 0) === parsed.network;
}

// Runs `fn` over `items` with a bounded number of concurrent in-flight calls.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
