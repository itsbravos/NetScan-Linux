export type DeviceType = 
  | 'router' 
  | 'desktop' 
  | 'laptop' 
  | 'mobile' 
  | 'smart_tv' 
  | 'printer' 
  | 'iot' 
  | 'server' 
  | 'camera' 
  | 'unknown';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface OpenPort {
  port: number;
  protocol: 'tcp' | 'udp';
  service: string;
  state: 'open' | 'filtered' | 'closed';
  banner?: string;
  securityNote?: string;
  risk: RiskLevel;
}

export interface Device {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  deviceType: DeviceType;
  status: 'online' | 'offline';
  firstSeen: string;
  lastSeen: string;
  isTrusted: boolean;
  isIgnored?: boolean;
  customName?: string;
  notes?: string;
  openPorts: OpenPort[];
  riskLevel: RiskLevel;
  latencyMs: number;
  pingHistory?: number[];
  osGuess?: string;
}

export interface IgnoredDevice {
  id: string;
  macOrIp: string;
  label?: string;
  addedAt: string;
}

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'emerald' | 'indigo' | 'amber' | 'coral' | 'purple';

export interface ThemeConfig {
  mode: ThemeMode;
  accent: AccentColor;
}

export interface TimelineDataPoint {
  time: string;
  total: number;
  trusted: number;
  untrusted: number;
  highRisk: number;
}

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  netmask: string;
  mac: string;
  subnet: string;
  isDefault: boolean;
}

export interface ScanConfig {
  targetSubnet: string;
  scanType: 'quick' | 'full' | 'ping_only' | 'nmap_custom';
  nmapFlags: string;
  portsToScan: string;
  autoScanInterval: number; // in seconds, 0 = off
  soundAlerts: boolean;
  desktopNotifications: boolean;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  totalDevices: number;
  newDevicesCount: number;
  highRiskCount: number;
  subnet: string;
  durationMs: number;
}

export interface NetworkAlert {
  id: string;
  timestamp: string;
  type: 'new_device' | 'port_opened' | 'device_offline' | 'high_risk';
  deviceId: string;
  deviceIp: string;
  deviceMac: string;
  message: string;
  read: boolean;
}

export interface SecurityAdvice {
  score: number;
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: Array<{
    id: string;
    title: string;
    severity: RiskLevel;
    description: string;
    affectedIp?: string;
    mitigation: string;
  }>;
}

export interface NetworkEventLog {
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

