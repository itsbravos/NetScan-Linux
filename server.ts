import express from "express";
import path from "path";
import os from "os";
import net from "net";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple file-backed storage for persistence
const DATA_DIR = path.join(process.cwd(), "data");
const TRUSTED_DEVICES_FILE = path.join(DATA_DIR, "trusted_devices.json");
const SCAN_HISTORY_FILE = path.join(DATA_DIR, "scan_history.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");
const IGNORED_DEVICES_FILE = path.join(DATA_DIR, "ignored_devices.json");
const NETWORK_EVENTS_FILE = path.join(DATA_DIR, "network_events.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Could not create data dir:", err);
  }
}

// In-memory state synchronized with JSON files
interface TrustedDeviceRecord {
  mac: string;
  ip: string;
  customName?: string;
  notes?: string;
  deviceType?: string;
  addedAt: string;
}

interface IgnoredDeviceRecord {
  id: string;
  macOrIp: string;
  label?: string;
  addedAt: string;
}

interface AlertRecord {
  id: string;
  timestamp: string;
  type: 'new_device' | 'port_opened' | 'device_offline' | 'high_risk';
  deviceId: string;
  deviceIp: string;
  deviceMac: string;
  message: string;
  read: boolean;
}

interface NetworkEventRecord {
  id: string;
  timestamp: string;
  type: 'connect' | 'new_ip' | 'trust_change' | 'scan' | 'vulnerability' | 'disconnect';
  title: string;
  description: string;
  deviceIp?: string;
  deviceMac?: string;
  vendor?: string;
  severity?: 'info' | 'warning' | 'alert' | 'success';
}

let trustedDevices: Map<string, TrustedDeviceRecord> = new Map();
let ignoredDevices: Map<string, IgnoredDeviceRecord> = new Map();
let alertsList: AlertRecord[] = [];
let scanHistoryList: any[] = [];
let networkEventsList: NetworkEventRecord[] = [];

// Initialize data from disk
function loadData() {
  try {
    if (fs.existsSync(TRUSTED_DEVICES_FILE)) {
      const raw = fs.readFileSync(TRUSTED_DEVICES_FILE, "utf-8");
      const list: TrustedDeviceRecord[] = JSON.parse(raw);
      list.forEach((item) => trustedDevices.set(item.mac.toLowerCase(), item));
    } else {
      // Seed default trusted gateway/router and server host
      const defaultTrusted: TrustedDeviceRecord[] = [
        {
          mac: "a4:12:42:89:11:01",
          ip: "192.168.1.1",
          customName: "Roteador Principal / Gateway",
          deviceType: "router",
          addedAt: new Date().toISOString(),
        },
        {
          mac: "70:85:c2:d4:ee:90",
          ip: "192.168.1.100",
          customName: "Servidor Linux Local (Este Dispositivo)",
          deviceType: "server",
          addedAt: new Date().toISOString(),
        }
      ];
      defaultTrusted.forEach((item) => trustedDevices.set(item.mac.toLowerCase(), item));
      saveTrustedDevices();
    }

    if (fs.existsSync(ALERTS_FILE)) {
      alertsList = JSON.parse(fs.readFileSync(ALERTS_FILE, "utf-8"));
    }

    if (fs.existsSync(SCAN_HISTORY_FILE)) {
      scanHistoryList = JSON.parse(fs.readFileSync(SCAN_HISTORY_FILE, "utf-8"));
    }

    if (fs.existsSync(IGNORED_DEVICES_FILE)) {
      const raw = fs.readFileSync(IGNORED_DEVICES_FILE, "utf-8");
      const list: IgnoredDeviceRecord[] = JSON.parse(raw);
      list.forEach((item) => ignoredDevices.set(item.macOrIp.toLowerCase(), item));
    }

    if (fs.existsSync(NETWORK_EVENTS_FILE)) {
      networkEventsList = JSON.parse(fs.readFileSync(NETWORK_EVENTS_FILE, "utf-8"));
    } else {
      // Seed initial persistent event log
      const now = Date.now();
      networkEventsList = [
        {
          id: `evt-1`,
          timestamp: new Date(now - 120000).toISOString(),
          type: 'new_ip',
          title: 'Novo IP detectado na subnet',
          description: 'Atribuição de IP DHCP 192.168.1.189 via servidor local',
          deviceIp: '192.168.1.189',
          deviceMac: '48:5f:99:a2:bb:11',
          vendor: 'Apple Inc.',
          severity: 'info'
        },
        {
          id: `evt-2`,
          timestamp: new Date(now - 600000).toISOString(),
          type: 'connect',
          title: 'Dispositivo conectado',
          description: 'Galaxy-S23-Ultra estabeleceu conexão na interface Wi-Fi 5GHz',
          deviceIp: '192.168.1.112',
          deviceMac: 'bc:d0:74:1a:8b:99',
          vendor: 'Samsung Electronics',
          severity: 'info'
        },
        {
          id: `evt-3`,
          timestamp: new Date(now - 1800000).toISOString(),
          type: 'vulnerability',
          title: 'Alerta de Segurança: Porta Telnet Exposta',
          description: 'Câmera de Segurança (192.168.1.144) com porta 23 aberta em texto claro',
          deviceIp: '192.168.1.144',
          deviceMac: '24:a0:74:33:10:ef',
          vendor: 'Hangzhou Hikvision Digital Tech',
          severity: 'alert'
        },
        {
          id: `evt-4`,
          timestamp: new Date(now - 3600000).toISOString(),
          type: 'trust_change',
          title: 'Status de Whitelist Atualizado',
          description: 'Servidor Linux Local marcado como dispositivo de alta confiança',
          deviceIp: '192.168.1.100',
          deviceMac: '70:85:c2:d4:ee:90',
          vendor: 'Dell Inc.',
          severity: 'success'
        }
      ];
      saveNetworkEvents();
    }
  } catch (err) {
    console.error("Error loading stored data:", err);
  }
}

function saveNetworkEvents() {
  try {
    fs.writeFileSync(NETWORK_EVENTS_FILE, JSON.stringify(networkEventsList.slice(0, 100), null, 2));
  } catch (err) {
    console.error("Error saving network events:", err);
  }
}

function saveTrustedDevices() {
  try {
    const list = Array.from(trustedDevices.values());
    fs.writeFileSync(TRUSTED_DEVICES_FILE, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error saving trusted devices:", err);
  }
}

function saveIgnoredDevices() {
  try {
    const list = Array.from(ignoredDevices.values());
    fs.writeFileSync(IGNORED_DEVICES_FILE, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error saving ignored devices:", err);
  }
}

function saveAlerts() {
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsList.slice(0, 100), null, 2));
  } catch (err) {
    console.error("Error saving alerts:", err);
  }
}

function saveScanHistory() {
  try {
    fs.writeFileSync(SCAN_HISTORY_FILE, JSON.stringify(scanHistoryList.slice(0, 50), null, 2));
  } catch (err) {
    console.error("Error saving scan history:", err);
  }
}

loadData();

// Get local network interfaces info
app.get("/api/network/interfaces", (req, res) => {
  const interfaces = os.networkInterfaces();
  const result: any[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === "IPv4") {
        // Calculate subnet estimate
        const ipParts = iface.address.split(".").map(Number);
        const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;

        result.push({
          name,
          ip: iface.address,
          netmask: iface.netmask,
          mac: iface.mac,
          subnet,
          isDefault: !iface.internal,
        });
      }
    }
  }

  // If no external interface found, append standard LAN default for demonstration
  if (result.length === 0 || !result.some((i) => !i.internal)) {
    result.unshift({
      name: "eth0",
      ip: "192.168.1.100",
      netmask: "255.255.255.0",
      mac: "70:85:c2:d4:ee:90",
      subnet: "192.168.1.0/24",
      isDefault: true,
    });
  }

  res.json({ interfaces: result });
});

// Helper: Check single TCP port on target IP
function probePort(ip: string, port: number, timeout = 600): Promise<boolean> {
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

// Known common port descriptions and security notes
const PORT_CATALOG: Record<number, { service: string; risk: 'safe' | 'low' | 'medium' | 'high' | 'critical'; note: string }> = {
  21: { service: "FTP", risk: "medium", note: "Protocolo FTP sem criptografia detectado. Risco de interceptação de credenciais." },
  22: { service: "SSH", risk: "low", note: "Serviço SSH ativo. Certifique-se de usar autenticação por chave e desativar login por senha root." },
  23: { service: "Telnet", risk: "critical", note: "Telnet exposto! Comunicação em texto claro altíssimamente vulnerável. Substitua por SSH imediatamente." },
  25: { service: "SMTP", risk: "medium", note: "Servidor de e-mail SMTP ativo." },
  53: { service: "DNS", risk: "low", note: "Servidor de nomes DNS local." },
  80: { service: "HTTP", risk: "low", note: "Servidor web HTTP aberto. Painel Web não criptografado." },
  110: { service: "POP3", risk: "medium", note: "Serviço de e-mail POP3 sem SSL." },
  139: { service: "NetBIOS", risk: "medium", note: "Compartilhamento NetBIOS Windows. Risco de enumeração de rede." },
  143: { service: "IMAP", risk: "medium", note: "Serviço de e-mail IMAP sem criptografia." },
  443: { service: "HTTPS", risk: "safe", note: "Servidor web seguro SSL/TLS." },
  445: { service: "SMB", risk: "high", note: "Protocolo SMB exposto! Alvo frequente para malwares tipo EternalBlue / Ransomware em rede local." },
  1433: { service: "MS SQL Server", risk: "high", note: "Banco de dados MS SQL exposto na rede local. Risco de força bruta." },
  3306: { service: "MySQL / MariaDB", risk: "high", note: "Banco de dados MySQL aberto para conexões de rede local." },
  3389: { service: "RDP (Windows Remote Desktop)", risk: "high", note: "Área de Trabalho Remota RDP exposta. Recomendado restringir acesso ou usar VPN." },
  5432: { service: "PostgreSQL", risk: "high", note: "Banco de dados PostgreSQL acessível na rede." },
  5900: { service: "VNC Remote Display", risk: "medium", note: "Acesso gráfico VNC exposto." },
  8080: { service: "HTTP Alternative / Proxy", risk: "low", note: "Serviço Web / Painel de Administração na porta 8080." },
  8443: { service: "HTTPS Alternative", risk: "safe", note: "Painel de administração SSL seguro." },
  9000: { service: "Portainer / Dev Web App", risk: "low", note: "Painel de containers ou API local." },
  27017: { service: "MongoDB", risk: "critical", note: "Banco NoSQL MongoDB aberto na rede! Verifique se a autenticação está habilitada." },
};

// Simulated / Real Network Scan Engine
app.post("/api/scan", async (req, res) => {
  const { targetSubnet = "192.168.1.0/24", scanType = "quick" } = req.body;
  const startTime = Date.now();

  // Test local port scan on 127.0.0.1 and 0.0.0.0 for real active services first!
  const realLocalOpenPorts: number[] = [];
  const testPorts = [21, 22, 80, 443, 3000, 3306, 5432, 8080, 9000];
  
  for (const p of testPorts) {
    const isOpen = await probePort("127.0.0.1", p, 200);
    if (isOpen) realLocalOpenPorts.push(p);
  }

  // Base list of devices representing the target subnet
  const baseSubnetPrefix = targetSubnet.split(".")[0] + "." + targetSubnet.split(".")[1] + "." + targetSubnet.split(".")[2];
  
  // Dynamic list representing realistic subnet environment
  const mockDevices = [
    {
      ip: `${baseSubnetPrefix}.1`,
      mac: "a4:12:42:89:11:01",
      hostname: "router.lan",
      vendor: "TP-Link Technologies",
      deviceType: "router",
      status: "online",
      latencyMs: Math.floor(Math.random() * 3) + 1,
      osGuess: "Linux 4.19 / OpenWrt RouterOS",
      ports: [80, 443, 53]
    },
    {
      ip: `${baseSubnetPrefix}.100`,
      mac: "70:85:c2:d4:ee:90",
      hostname: "linux-server-node.local",
      vendor: "Dell Inc. / Cloud Host",
      deviceType: "server",
      status: "online",
      latencyMs: 1,
      osGuess: "Ubuntu Linux 22.04 LTS (Kernel 6.2)",
      ports: realLocalOpenPorts.length > 0 ? realLocalOpenPorts : [22, 80, 443, 3000, 8080]
    },
    {
      ip: `${baseSubnetPrefix}.105`,
      mac: "b8:27:eb:aa:4f:21",
      hostname: "raspberrypi-homeassistant",
      vendor: "Raspberry Pi Foundation",
      deviceType: "iot",
      status: "online",
      latencyMs: Math.floor(Math.random() * 8) + 2,
      osGuess: "Raspbian / Debian 11",
      ports: [22, 8080, 1883]
    },
    {
      ip: `${baseSubnetPrefix}.112`,
      mac: "bc:d0:74:1a:8b:99",
      hostname: "Galaxy-S23-Ultra",
      vendor: "Samsung Electronics",
      deviceType: "mobile",
      status: "online",
      latencyMs: Math.floor(Math.random() * 25) + 5,
      osGuess: "Android 14 / OneUI 6",
      ports: []
    },
    {
      ip: `${baseSubnetPrefix}.120`,
      mac: "3c:22:fb:ee:74:02",
      hostname: "LG-SmartTV-OLED",
      vendor: "LG Electronics",
      deviceType: "smart_tv",
      status: "online",
      latencyMs: Math.floor(Math.random() * 12) + 3,
      osGuess: "webOS TV 8.0",
      ports: [8001, 8080]
    },
    {
      ip: `${baseSubnetPrefix}.135`,
      mac: "30:cd:a7:89:bc:de",
      hostname: "HP-LaserJet-Pro",
      vendor: "HP Inc.",
      deviceType: "printer",
      status: "online",
      latencyMs: Math.floor(Math.random() * 15) + 4,
      osGuess: "HP JetDirect Firmware",
      ports: [80, 443, 631, 9100]
    },
    {
      ip: `${baseSubnetPrefix}.144`,
      mac: "24:a0:74:33:10:ef",
      hostname: "Security-Cam-FrontYard",
      vendor: "Hangzhou Hikvision Digital Tech",
      deviceType: "camera",
      status: "online",
      latencyMs: Math.floor(Math.random() * 10) + 2,
      osGuess: "Embedded Linux Camera OS",
      ports: [80, 554, 8000, 23] // Note: Telnet 23 open creates security alert!
    },
    {
      ip: `${baseSubnetPrefix}.189`,
      mac: "48:5f:99:a2:bb:11",
      hostname: "iPhone-15-Pro-Desk",
      vendor: "Apple Inc.",
      deviceType: "mobile",
      status: "online",
      latencyMs: Math.floor(Math.random() * 18) + 4,
      osGuess: "iOS 17.5",
      ports: []
    }
  ];

  // Occasionally simulate a new unknown device joining if requested or in deep scans
  if (scanType === "full" || req.body.forceNewDevice) {
    mockDevices.push({
      ip: `${baseSubnetPrefix}.210`,
      mac: "98:ed:5c:22:90:7f",
      hostname: "DESCONHECIDO-DEV-3",
      vendor: "Espressif Inc. (ESP32 Smart Device)",
      deviceType: "iot",
      status: "online",
      latencyMs: Math.floor(Math.random() * 30) + 10,
      osGuess: "FreeRTOS / ESP32 Microcontroller",
      ports: [80, 23, 1883]
    });
  }

  const nowIso = new Date().toISOString();
  let newDevicesCount = 0;
  let highRiskCount = 0;

  const scannedDevices = mockDevices.map((dev) => {
    const macLower = dev.mac.toLowerCase();
    const ipLower = dev.ip.toLowerCase();
    const isIgnored = ignoredDevices.has(macLower) || ignoredDevices.has(ipLower);
    const isTrusted = trustedDevices.has(macLower) || isIgnored;
    const trustedRecord = trustedDevices.get(macLower);

    if (!isTrusted && !isIgnored) {
      newDevicesCount++;
      // Check if we already created an alert for this new device
      const existingAlert = alertsList.find((a) => a.deviceMac.toLowerCase() === macLower && a.type === 'new_device');
      if (!existingAlert) {
        const newAlert: AlertRecord = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowIso,
          type: "new_device",
          deviceId: macLower,
          deviceIp: dev.ip,
          deviceMac: dev.mac,
          message: `🚨 Novo dispositivo desconhecido detectado na rede: IP ${dev.ip} (${dev.vendor})`,
          read: false,
        };
        alertsList.unshift(newAlert);
      }
    }

    // Build open ports list
    const openPorts = dev.ports.map((portNum) => {
      const catalog = PORT_CATALOG[portNum] || {
        service: `Porta ${portNum}`,
        risk: "low" as const,
        note: "Porta de rede personalizada ou desconhecida."
      };

      return {
        port: portNum,
        protocol: "tcp" as const,
        service: catalog.service,
        state: "open" as const,
        securityNote: catalog.note,
        risk: catalog.risk,
      };
    });

    // Calculate device risk level
    let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical' = 'safe';
    if (openPorts.some(p => p.risk === 'critical')) riskLevel = 'critical';
    else if (openPorts.some(p => p.risk === 'high')) riskLevel = 'high';
    else if (openPorts.some(p => p.risk === 'medium')) riskLevel = 'medium';
    else if (openPorts.length > 0) riskLevel = 'low';

    if (riskLevel === 'high' || riskLevel === 'critical') {
      highRiskCount++;
    }

    // Generate 10 ping history samples around current latencyMs
    const baseLatency = dev.latencyMs;
    const pingHistory = Array.from({ length: 10 }).map((_, i) => {
      const delta = Math.floor(Math.random() * Math.max(3, Math.round(baseLatency * 0.4))) - Math.floor(Math.max(1, Math.round(baseLatency * 0.2)));
      return Math.max(1, baseLatency + delta);
    });

    return {
      id: macLower.replace(/:/g, "-"),
      ip: dev.ip,
      mac: dev.mac,
      hostname: dev.hostname,
      vendor: dev.vendor,
      deviceType: trustedRecord?.deviceType || dev.deviceType,
      status: dev.status,
      firstSeen: trustedRecord?.addedAt || nowIso,
      lastSeen: nowIso,
      isTrusted,
      isIgnored,
      customName: trustedRecord?.customName,
      notes: trustedRecord?.notes,
      openPorts,
      riskLevel,
      latencyMs: dev.latencyMs,
      pingHistory,
      osGuess: dev.osGuess,
    };
  });

  saveAlerts();

  const scanDuration = Date.now() - startTime;

  // Add history record
  const historyItem = {
    id: `scan-${Date.now()}`,
    timestamp: nowIso,
    totalDevices: scannedDevices.length,
    newDevicesCount,
    highRiskCount,
    subnet: targetSubnet,
    durationMs: scanDuration,
  };
  scanHistoryList.unshift(historyItem);
  saveScanHistory();

  res.json({
    devices: scannedDevices,
    summary: {
      total: scannedDevices.length,
      trusted: scannedDevices.filter((d) => d.isTrusted).length,
      untrusted: newDevicesCount,
      highRisk: highRiskCount,
      scanDurationMs: scanDuration,
    },
    alerts: alertsList,
  });
});

// Port Scanner API for single IP target
app.post("/api/scan/port", async (req, res) => {
  const { ip = "127.0.0.1", ports = [21, 22, 23, 80, 443, 445, 1433, 3306, 3389, 5432, 8080, 9000] } = req.body;

  const results = [];
  
  for (const port of ports) {
    // If scanning localhost or real accessible target IP, run real TCP socket check!
    let isOpen = false;
    if (ip === "127.0.0.1" || ip === "localhost") {
      isOpen = await probePort("127.0.0.1", port, 250);
    } else {
      // For simulated LAN targets, align with realistic open port profile
      const catalog = PORT_CATALOG[port];
      const isCommonSimulatedOpen = [80, 443, 22, 53, 8080].includes(port);
      isOpen = isCommonSimulatedOpen;
    }

    const catalog = PORT_CATALOG[port] || {
      service: `Custom (${port})`,
      risk: "low",
      note: "Porta não catalogada"
    };

    results.push({
      port,
      protocol: "tcp",
      state: isOpen ? "open" : "closed",
      service: catalog.service,
      risk: catalog.risk,
      securityNote: isOpen ? catalog.note : "Porta fechada/bloqueada no firewall.",
    });
  }

  res.json({
    targetIp: ip,
    timestamp: new Date().toISOString(),
    scannedPortsCount: ports.length,
    openPortsCount: results.filter((r) => r.state === "open").length,
    ports: results,
  });
});

// Nmap Terminal Command Executor & Output Generator
app.post("/api/nmap/exec", (req, res) => {
  const { command = "nmap -sV -O 192.168.1.0/24", targetIp = "192.168.1.1" } = req.body;
  const now = new Date();
  const formattedTime = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR");

  let stdout = `Starting Nmap 7.94 ( https://nmap.org ) at ${formattedTime} UTC
NSE: Loaded 155 scripts for scanning.
Initiating ARP Ping Scan at ${now.toLocaleTimeString("pt-BR")}
Scanning 256 hosts [1 port/host]
Completed ARP Ping Scan at ${now.toLocaleTimeString("pt-BR")}, 0.85s elapsed (256 total hosts)

Nmap scan report for router.lan (${targetIp})
Host is up (0.0018s latency).
Not shown: 996 closed tcp ports (reset)
PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 8.9p1 Ubuntu 3ubuntu0.6 (Ubuntu Linux; protocol 2.0)
53/tcp   open  domain     dnsmasq 2.86
80/tcp   open  http       lighttpd 1.4.63
443/tcp  open  ssl/https  lighttpd 1.4.63
MAC Address: A4:12:42:89:11:01 (TP-Link Technologies Co., Ltd.)
Device type: general purpose | router
Running: Linux 4.X|5.X
OS CPE: cpe:/o:linux:linux_kernel:4 cpe:/o:linux:linux_kernel:5
OS details: Linux 4.19 or Linux 5.4 OpenWrt
Network Distance: 1 hop

Nmap scan report for linux-server.local (${targetIp.endsWith(".1") ? "192.168.1.100" : targetIp})
Host is up (0.0004s latency).
PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 9.0 (protocol 2.0)
80/tcp   open  http       Nginx 1.24.0
443/tcp  open  ssl/https  Nginx 1.24.0
3000/tcp open  ppp?       Node.js Express App (AI Studio Container)
8080/tcp open  http-proxy Traefik Proxy 2.10
MAC Address: 70:85:C2:D4:EE:90 (Dell Inc.)
OS details: Ubuntu 22.04 LTS Linux Server

Nmap done: 256 IP addresses (8 hosts up) scanned in 4.32 seconds
`;

  res.json({
    command,
    timestamp: now.toISOString(),
    rawStdout: stdout,
  });
});

// Update trusted status & details for a device
app.post("/api/devices/trust", (req, res) => {
  const { mac, isTrusted, customName, deviceType, notes } = req.body;
  if (!mac) {
    return res.status(400).json({ error: "MAC address required" });
  }

  const macLower = mac.toLowerCase();

  if (isTrusted) {
    trustedDevices.set(macLower, {
      mac: macLower,
      ip: req.body.ip || "0.0.0.0",
      customName: customName || undefined,
      notes: notes || undefined,
      deviceType: deviceType || "unknown",
      addedAt: new Date().toISOString(),
    });
    // Mark related alerts as read
    alertsList.forEach((a) => {
      if (a.deviceMac.toLowerCase() === macLower) {
        a.read = true;
      }
    });

    // Record event log
    networkEventsList.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'trust_change',
      title: 'Dispositivo adicionado à Whitelist',
      description: `Dispositivo ${customName ? `'${customName}' ` : ''}(IP: ${req.body.ip || 'Local'}, MAC: ${macLower}) foi marcado como confiável.`,
      deviceIp: req.body.ip,
      deviceMac: macLower,
      severity: 'success',
    });
  } else {
    trustedDevices.delete(macLower);
    // Record event log
    networkEventsList.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'trust_change',
      title: 'Dispositivo removido da Whitelist',
      description: `Dispositivo (MAC: ${macLower}) foi alterado para status não confiável/desconhecido.`,
      deviceMac: macLower,
      severity: 'warning',
    });
  }

  saveTrustedDevices();
  saveAlerts();
  saveNetworkEvents();

  res.json({ success: true, mac: macLower, isTrusted });
});

// Get Alerts
app.get("/api/alerts", (req, res) => {
  res.json({ alerts: alertsList });
});

// Mark all alerts as read
app.post("/api/alerts/read", (req, res) => {
  alertsList.forEach((a) => (a.read = true));
  saveAlerts();
  res.json({ success: true });
});

// GET Blacklist / Ignored devices
app.get("/api/blacklist", (req, res) => {
  res.json({ blacklist: Array.from(ignoredDevices.values()) });
});

// Add IP or MAC to Blacklist / Ignore list
app.post("/api/blacklist", (req, res) => {
  const { macOrIp, label } = req.body;
  if (!macOrIp || typeof macOrIp !== "string") {
    return res.status(400).json({ error: "IP ou MAC address é obrigatório." });
  }

  const cleaned = macOrIp.trim().toLowerCase();
  const id = `ignore-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const record: IgnoredDeviceRecord = {
    id,
    macOrIp: cleaned,
    label: label || "Dispositivo Ignorado / Ignorado pelo usuário",
    addedAt: new Date().toISOString(),
  };

  ignoredDevices.set(cleaned, record);
  saveIgnoredDevices();

  res.json({ success: true, record });
});

// Delete item from Blacklist
app.delete("/api/blacklist/:id", (req, res) => {
  const { id } = req.params;
  
  let deleted = false;
  for (const [key, val] of ignoredDevices.entries()) {
    if (val.id === id || val.macOrIp.toLowerCase() === id.toLowerCase()) {
      ignoredDevices.delete(key);
      deleted = true;
      break;
    }
  }

  if (deleted) {
    saveIgnoredDevices();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Item não encontrado na blacklist." });
  }
});

// GET 24-hour temporal device trend timeline for Recharts audit chart
app.get("/api/history/timeline", (req, res) => {
  const points = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 2 * 3600 * 1000);
    const hourLabel = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    let total = 8;
    let trusted = 6;
    let untrusted = 2;
    let highRisk = 1;

    if (i === 0 && scanHistoryList.length > 0) {
      total = scanHistoryList[0].totalDevices || 8;
      untrusted = scanHistoryList[0].newDevicesCount || 1;
      highRisk = scanHistoryList[0].highRiskCount || 1;
      trusted = Math.max(0, total - untrusted);
    } else {
      const offset = (i % 3) - 1;
      total = Math.max(5, 8 + offset);
      untrusted = Math.max(0, (i % 4 === 0 ? 2 : 1) - (i > 6 ? 1 : 0));
      trusted = Math.max(0, total - untrusted);
      highRisk = i % 5 === 0 ? 2 : (i % 2 === 0 ? 1 : 0);
    }

    points.push({
      time: hourLabel,
      total,
      trusted,
      untrusted,
      highRisk,
    });
  }

  res.json({ timeline: points });
});

// GET Persistent Network Events Log
app.get("/api/history/events", (req, res) => {
  res.json({ events: networkEventsList });
});

// POST Add New Event Log Entry
app.post("/api/history/events", (req, res) => {
  const { type, title, description, deviceIp, deviceMac, vendor, severity } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Título é obrigatório." });
  }

  const newEvent: NetworkEventRecord = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    type: type || 'connect',
    title,
    description: description || '',
    deviceIp,
    deviceMac,
    vendor,
    severity: severity || 'info',
  };

  networkEventsList.unshift(newEvent);
  saveNetworkEvents();

  res.json({ success: true, event: newEvent });
});

// DELETE Clear Event Logs
app.delete("/api/history/events", (req, res) => {
  networkEventsList = [];
  saveNetworkEvents();
  res.json({ success: true });
});

// Cybersecurity Analysis via Built-in Heuristic Security Engine
app.post("/api/security/ai-analysis", async (req, res) => {
  const { devices = [] } = req.body;

  // Heuristic Security Engine
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  const recommendations: any[] = [];

  devices.forEach((dev: any) => {
    // Check untrusted
    if (!dev.isTrusted) {
      highCount++;
      recommendations.push({
        id: `rec-untrusted-${dev.ip}`,
        title: `Dispositivo Não Reconhecido na Rede (${dev.ip})`,
        severity: "high",
        description: `O dispositivo com MAC ${dev.mac} (${dev.vendor}) está conectado à sua rede local, mas não foi marcado como conhecido.`,
        affectedIp: dev.ip,
        mitigation: "Verifique a autenticidade do dispositivo. Caso seja legítimo, marque-o como conhecido no painel. Se for desconhecido, altere a senha do Wi-Fi/Roteador.",
      });
    }

    // Check dangerous open ports
    dev.openPorts?.forEach((p: any) => {
      if (p.port === 23) {
        criticalCount++;
        recommendations.push({
          id: `rec-telnet-${dev.ip}`,
          title: `Protocolo Telnet Exposto (Porta 23) em ${dev.ip}`,
          severity: "critical",
          description: "O serviço Telnet transmite logins e senhas em texto puro pela rede local, permitindo captura fácil por sniffing.",
          affectedIp: dev.ip,
          mitigation: "Desative o serviço Telnet no dispositivo e utilize SSH com autenticação por chave de segurança.",
        });
      } else if (p.port === 445 || p.port === 139) {
        highCount++;
        recommendations.push({
          id: `rec-smb-${dev.ip}`,
          title: `Compartilhamento SMB/NetBIOS Ativo (${dev.ip})`,
          severity: "high",
          description: "Serviços SMB sem correções adequadas podem conter vulnerabilidades críticas (ex: EternalBlue) usadas por ransomware.",
          affectedIp: dev.ip,
          mitigation: "Garanta que o protocolo SMBv1 esteja desativado e limite os compartilhamentos de rede com autenticação forte.",
        });
      } else if (p.port === 3389) {
        mediumCount++;
        recommendations.push({
          id: `rec-rdp-${dev.ip}`,
          title: `Área de Trabalho Remota RDP Aberta (${dev.ip})`,
          severity: "medium",
          description: "Porta RDP acessível permite tentativas de força bruta de senha de administração.",
          affectedIp: dev.ip,
          mitigation: "Habilite Autenticação em Nível de Rede (NLA) e restrinja acesso via Firewall ou VPN.",
        });
      } else if (p.port === 21) {
        mediumCount++;
        recommendations.push({
          id: `rec-ftp-${dev.ip}`,
          title: `FTP Sem Criptografia (${dev.ip})`,
          severity: "medium",
          description: "Servidor FTP aberto sem suporte a TLS/SFTP.",
          affectedIp: dev.ip,
          mitigation: "Migre para SFTP (Porta 22) ou FTPS para proteger transferência de arquivos.",
        });
      }
    });
  });

  const totalRisks = criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3;
  const score = Math.max(10, 100 - totalRisks);

  res.json({
    score,
    riskSummary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
    recommendations,
  });
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Scanner de Rede Express rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
