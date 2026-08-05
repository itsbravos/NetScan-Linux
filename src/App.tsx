import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  ListFilter, 
  Network, 
  Radio, 
  Terminal, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Server,
  Activity,
  Layers,
  AlertOctagon,
  Download,
  ShieldX,
  Gauge
} from 'lucide-react';
import { 
  Device, 
  NetworkInterfaceInfo, 
  ScanConfig, 
  NetworkAlert,
  ThemeConfig,
  AccentColor
} from './types';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { DeviceList } from './components/DeviceList';
import { NetworkTopology } from './components/NetworkTopology';
import { PortScannerView } from './components/PortScannerView';
import { NmapTerminal } from './components/NmapTerminal';
import { SecurityAdvisor } from './components/SecurityAdvisor';
import { TrustedDevicesView } from './components/TrustedDevicesView';
import { BlacklistSettingsView } from './components/BlacklistSettingsView';
import { Speedtest } from './components/Speedtest';
import { DeviceModal } from './components/DeviceModal';
import { playAlertSound } from './lib/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState<'devices' | 'topology' | 'portscanner' | 'nmap' | 'security' | 'whitelist' | 'speedtest' | 'blacklist'>('devices');
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('eth0');
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDeviceModal, setSelectedDeviceModal] = useState<Device | null>(null);
  const [targetNmapIp, setTargetNmapIp] = useState<string>('192.168.1.0/24');

  // Keyboard shortcut listener (1-8 for tab navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '1') setActiveTab('devices');
      else if (e.key === '2') setActiveTab('topology');
      else if (e.key === '3') setActiveTab('portscanner');
      else if (e.key === '4') setActiveTab('nmap');
      else if (e.key === '5') setActiveTab('security');
      else if (e.key === '6') setActiveTab('whitelist');
      else if (e.key === '7') setActiveTab('speedtest');
      else if (e.key === '8') setActiveTab('blacklist');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme configuration state
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('netscan_theme_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { mode: 'dark', accent: 'blue' };
  });

  // Save theme config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('netscan_theme_config', JSON.stringify(themeConfig));
      if (themeConfig.mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, [themeConfig]);

  // Scan configuration state with localStorage persistence
  const [scanConfig, setScanConfig] = useState<ScanConfig>(() => {
    try {
      const saved = localStorage.getItem('netscan_scan_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      targetSubnet: '192.168.1.0/24',
      scanType: 'quick',
      nmapFlags: '-sV -O',
      portsToScan: '21,22,80,443,8080',
      autoScanInterval: 0,
      soundAlerts: true,
      desktopNotifications: false,
    };
  });

  // Save scanConfig to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('netscan_scan_config', JSON.stringify(scanConfig));
    } catch (e) {}
  }, [scanConfig]);

  // Save targetNmapIp to localStorage
  useEffect(() => {
    try {
      if (scanConfig.targetSubnet) {
        localStorage.setItem('netscan_target_subnet', scanConfig.targetSubnet);
      }
    } catch (e) {}
  }, [scanConfig.targetSubnet]);

  // Helper to map theme accent color to Tailwind bg class
  const getAccentBgClass = (accent: AccentColor) => {
    switch (accent) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500';
      case 'coral': return 'bg-rose-600 hover:bg-rose-500';
      case 'purple': return 'bg-purple-600 hover:bg-purple-500';
      case 'blue':
      default: return 'bg-sky-600 hover:bg-sky-500';
    }
  };

  const getAccentTextClass = (accent: AccentColor) => {
    switch (accent) {
      case 'emerald': return 'text-emerald-500';
      case 'indigo': return 'text-indigo-500';
      case 'amber': return 'text-amber-500';
      case 'coral': return 'text-rose-500';
      case 'purple': return 'text-purple-500';
      case 'blue':
      default: return 'text-sky-500';
    }
  };

  const accentBgClass = getAccentBgClass(themeConfig.accent);
  const accentTextClass = getAccentTextClass(themeConfig.accent);

  // Fetch Network Interfaces
  const fetchInterfaces = async () => {
    try {
      const res = await fetch('/api/network/interfaces');
      const data = await res.json();
      if (data.interfaces && data.interfaces.length > 0) {
        setInterfaces(data.interfaces);
        const def = data.interfaces.find((i: any) => i.isDefault) || data.interfaces[0];
        setSelectedInterface(def.name);
        
        // Preserve user-defined targetSubnet if saved in localStorage
        const savedSubnet = localStorage.getItem('netscan_target_subnet');
        if (!savedSubnet) {
          setScanConfig((prev) => ({ ...prev, targetSubnet: def.subnet }));
          setTargetNmapIp(def.subnet);
        } else {
          setTargetNmapIp(savedSubnet);
        }
      }
    } catch (err) {
      console.error("Error loading network interfaces:", err);
    }
  };

  // Perform Scan
  const handleStartScan = async (scanType: 'quick' | 'full' = 'quick', forceNew = false) => {
    setIsScanning(true);
    try {
      const currentIface = interfaces.find((i) => i.name === selectedInterface);
      const subnetToScan = currentIface ? currentIface.subnet : scanConfig.targetSubnet;

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSubnet: subnetToScan,
          scanType,
          forceNewDevice: forceNew,
        }),
      });

      const data = await res.json();
      if (data.devices) {
        setDevices(data.devices);
        setAlerts(data.alerts || []);

        // Check if new untrusted non-ignored devices arrived
        const hasNewUntrusted = data.devices.some((d: Device) => !d.isTrusted && !d.isIgnored);
        if (hasNewUntrusted && scanConfig.soundAlerts) {
          playAlertSound('new_device');
        } else if (scanConfig.soundAlerts) {
          playAlertSound('scan_done');
        }
      }
    } catch (err) {
      console.error("Error executing network scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchInterfaces();
    handleStartScan('quick');
  }, []);

  // Auto Scan Interval Timer
  useEffect(() => {
    if (scanConfig.autoScanInterval <= 0) return;

    const intervalMs = scanConfig.autoScanInterval * 1000;
    const timer = setInterval(() => {
      if (!isScanning) {
        handleStartScan('quick');
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [scanConfig.autoScanInterval, selectedInterface, isScanning]);

  // Toggle Trust Status
  const handleToggleTrust = async (device: Device) => {
    const newTrustStatus = !device.isTrusted;
    try {
      await fetch('/api/devices/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: device.mac,
          ip: device.ip,
          isTrusted: newTrustStatus,
          customName: device.customName,
          deviceType: device.deviceType,
        }),
      });

      // Update local state
      setDevices((prev) =>
        prev.map((d) => (d.mac === device.mac ? { ...d, isTrusted: newTrustStatus } : d))
      );

      if (selectedDeviceModal && selectedDeviceModal.mac === device.mac) {
        setSelectedDeviceModal((prev) => prev ? { ...prev, isTrusted: newTrustStatus } : null);
      }
    } catch (err) {
      console.error("Error updating trust status:", err);
    }
  };

  // Approve all untrusted devices at once
  const handleApproveAllUntrusted = async () => {
    const untrusted = devices.filter((d) => !d.isTrusted && !d.isIgnored);
    for (const dev of untrusted) {
      await handleToggleTrust(dev);
    }
  };

  // Update device nickname & notes
  const handleUpdateDeviceDetails = async (mac: string, customName: string, notes: string) => {
    try {
      const targetDev = devices.find((d) => d.mac === mac);
      if (!targetDev) return;

      await fetch('/api/devices/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac,
          ip: targetDev.ip,
          isTrusted: true, // Auto-approve when customized
          customName,
          notes,
          deviceType: targetDev.deviceType,
        }),
      });

      setDevices((prev) =>
        prev.map((d) => (d.mac === mac ? { ...d, isTrusted: true, customName, notes } : d))
      );
    } catch (err) {
      console.error("Error updating device notes:", err);
    }
  };

  // Clear Alerts
  const handleClearAlerts = async () => {
    try {
      await fetch('/api/alerts/read', { method: 'POST' });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      console.error("Error clearing alerts:", err);
    }
  };

  const untrustedDevices = devices.filter((d) => !d.isTrusted && !d.isIgnored);
  const highRiskCount = devices.filter((d) => d.riskLevel === 'high' || d.riskLevel === 'critical').length;
  const isLight = themeConfig.mode === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white transition-colors duration-200 ${
      isLight ? 'bg-[#f8f6f0] text-slate-900' : 'bg-[#090d16] text-slate-100'
    }`}>
      
      {/* Top Header */}
      <Header
        interfaces={interfaces}
        selectedInterface={selectedInterface}
        onSelectInterface={(name) => {
          setSelectedInterface(name);
          const iface = interfaces.find((i) => i.name === name);
          if (iface) {
            setScanConfig((prev) => ({ ...prev, targetSubnet: iface.subnet }));
            setTargetNmapIp(iface.subnet);
          }
        }}
        isScanning={isScanning}
        onStartScan={handleStartScan}
        scanConfig={scanConfig}
        onUpdateConfig={(cfg) => setScanConfig((prev) => ({ ...prev, ...cfg }))}
        alerts={alerts}
        onClearAlerts={handleClearAlerts}
        untrustedCount={untrustedDevices.length}
        themeConfig={themeConfig}
        onToggleThemeMode={() => setThemeConfig((prev) => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }))}
        onOpenSettings={() => setActiveTab('blacklist')}
        accentBgClass={accentBgClass}
      />

      {/* Untrusted / New Device Alert Banner */}
      <AlertBanner
        untrustedDevices={untrustedDevices}
        onApproveAll={handleApproveAllUntrusted}
        onInspect={(dev) => setSelectedDeviceModal(dev)}
        themeMode={themeConfig.mode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-start">
          <div className={`p-1.5 border-2 rounded-2xl inline-flex items-center max-w-full overflow-x-auto scrollbar-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] gap-1.5 transition-all ${
            isLight ? 'bg-white border-slate-900' : 'bg-slate-900 border-slate-700'
          }`}>
            {[
              { id: 'devices', label: 'Dispositivos', icon: ListFilter, key: '1' },
              { id: 'topology', label: 'Mapa da Topologia', icon: Network, key: '2' },
              { id: 'portscanner', label: 'Scanner de Portas', icon: Radio, key: '3' },
              { id: 'nmap', label: 'Terminal Nmap', icon: Terminal, key: '4' },
              { id: 'security', label: 'Auditoria & Traffic Heatmap', icon: Sparkles, key: '5' },
              { id: 'whitelist', label: 'Whitelist (Conhecidos)', icon: ShieldCheck, key: '6' },
              { id: 'speedtest', label: 'Speedtest', icon: Gauge, key: '7' },
              { id: 'blacklist', label: 'Ignorados & Configurações', icon: ShieldX, key: '8' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  title={`${tab.label} (Atalho teclado: ${tab.key})`}
                  className={`btn-neo px-3 py-2 text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? `${accentBgClass} text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-900'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-current" />
                  {isActive && <span className="tracking-tight">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'devices' && (
          <DeviceList
            devices={devices}
            isScanning={isScanning}
            onSelectDevice={(dev) => setSelectedDeviceModal(dev)}
            onToggleTrust={handleToggleTrust}
            onEditName={(dev) => setSelectedDeviceModal(dev)}
            onStartScan={handleStartScan}
            onOpenSpeedtest={() => setActiveTab('speedtest')}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'topology' && (
          <NetworkTopology
            devices={devices}
            onSelectDevice={(dev) => setSelectedDeviceModal(dev)}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'portscanner' && (
          <PortScannerView
            defaultIp={devices[0]?.ip || '127.0.0.1'}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'nmap' && (
          <NmapTerminal
            targetIp={targetNmapIp}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'security' && (
          <SecurityAdvisor
            devices={devices}
            onInspectDeviceByIp={(ip) => {
              const dev = devices.find((d) => d.ip === ip);
              if (dev) setSelectedDeviceModal(dev);
            }}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'whitelist' && (
          <TrustedDevicesView
            devices={devices}
            onToggleTrust={handleToggleTrust}
            onEditName={(dev) => setSelectedDeviceModal(dev)}
            themeMode={themeConfig.mode}
          />
        )}

        {activeTab === 'speedtest' && (
          <Speedtest themeMode={themeConfig.mode} />
        )}

        {activeTab === 'blacklist' && (
          <BlacklistSettingsView
            themeConfig={themeConfig}
            onUpdateTheme={(cfg) => setThemeConfig((prev) => ({ ...prev, ...cfg }))}
            accentBgClass={accentBgClass}
          />
        )}

      </main>

      {/* Device Details Modal */}
      <DeviceModal
        device={selectedDeviceModal}
        onClose={() => setSelectedDeviceModal(null)}
        onToggleTrust={handleToggleTrust}
        onUpdateDeviceDetails={handleUpdateDeviceDetails}
        onOpenNmapWithTarget={(ip) => {
          setTargetNmapIp(ip);
          setActiveTab('nmap');
        }}
        themeMode={themeConfig.mode}
      />

      {/* Footer */}
      <footer className={`border-t-2 py-4 text-center text-xs font-mono transition-colors ${
        isLight ? 'bg-white border-slate-900 text-slate-600' : 'bg-slate-950 border-slate-900 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NetScan Linux - Mapeador de Rede Local & Auditor Nmap</span>
          <span>Linux Cloud Environment | Neo-Brutalist Frosted UI</span>
        </div>
      </footer>

    </div>
  );
}
