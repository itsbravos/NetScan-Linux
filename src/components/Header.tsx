import React, { useState } from 'react';
import { 
  Wifi, 
  ShieldAlert, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Bell, 
  Check, 
  Clock, 
  Server,
  Zap,
  Radio,
  Sliders,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { NetworkInterfaceInfo, NetworkAlert, ScanConfig, ThemeConfig } from '../types';

interface HeaderProps {
  interfaces: NetworkInterfaceInfo[];
  selectedInterface: string;
  onSelectInterface: (ifaceName: string) => void;
  isScanning: boolean;
  onStartScan: (type: 'quick' | 'full', forceNew?: boolean) => void;
  scanConfig: ScanConfig;
  onUpdateConfig: (newConfig: Partial<ScanConfig>) => void;
  alerts: NetworkAlert[];
  onClearAlerts: () => void;
  untrustedCount: number;
  themeConfig: ThemeConfig;
  onToggleThemeMode: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  accentBgClass: string;
}

export const Header: React.FC<HeaderProps> = ({
  interfaces,
  selectedInterface,
  onSelectInterface,
  isScanning,
  onStartScan,
  scanConfig,
  onUpdateConfig,
  alerts,
  onClearAlerts,
  untrustedCount,
  themeConfig,
  onToggleThemeMode,
  onOpenSettings,
  onLogout,
  accentBgClass,
}) => {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.read);
  const currentIface = interfaces.find(i => i.name === selectedInterface) || interfaces[0];
  const isLight = themeConfig.mode === 'light';

  return (
    <header className={`sticky top-0 z-30 border-b-2 transition-colors ${
      isLight 
        ? 'bg-white border-slate-900 text-slate-900 shadow-[0_4px_0px_0px_rgba(0,0,0,1)]' 
        : 'bg-slate-900 border-slate-700 text-slate-100 shadow-xl'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-h-[3.75rem]">
          
          {/* Logo & Network Status Badge */}
          <div className="flex items-center justify-between md:justify-start space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 border-2 border-slate-900 rounded-xl text-white ${accentBgClass} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0`}>
                <Radio className={`w-5 h-5 ${isScanning ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex items-center gap-2 flex-wrap leading-snug">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                  NetScan Linux
                </h1>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border-2 font-extrabold leading-none ${
                  isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  Nmap v7.94
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-end flex-wrap gap-2">
            
            {/* Interface Selector Dropdown (Desktop/Tablet) */}
            <div className="relative hidden sm:block">
              <select
                value={selectedInterface}
                onChange={(e) => onSelectInterface(e.target.value)}
                className={`h-9 border-2 text-xs font-bold rounded-xl px-3 focus:outline-none cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                  isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {interfaces.map((iface) => (
                  <option key={iface.name} value={iface.name}>
                    {iface.name} - {iface.subnet} ({iface.ip})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Scan Interval Selector */}
            <div className={`h-9 flex items-center space-x-1.5 border-2 rounded-xl px-2.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
              isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Auto:</span>
              <select
                value={scanConfig.autoScanInterval}
                onChange={(e) => onUpdateConfig({ autoScanInterval: Number(e.target.value) })}
                className="bg-transparent text-xs focus:outline-none cursor-pointer font-extrabold"
              >
                <option value={0} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>Off</option>
                <option value={10} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>10s</option>
                <option value={30} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>30s</option>
                <option value={60} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>1m</option>
                <option value={300} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>5m</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleThemeMode}
              title={isLight ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
              className={`h-9 w-9 flex items-center justify-center rounded-xl border-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                isLight ? 'bg-amber-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-amber-400'
              }`}
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-600" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => onUpdateConfig({ soundAlerts: !scanConfig.soundAlerts })}
              title={scanConfig.soundAlerts ? "Sons ativados" : "Sons desativados"}
              className={`h-9 w-9 flex items-center justify-center rounded-xl border-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                scanConfig.soundAlerts
                  ? isLight ? 'bg-emerald-100 border-slate-900 text-emerald-700' : 'bg-slate-800 border-slate-700 text-emerald-400'
                  : isLight ? 'bg-slate-100 border-slate-400 text-slate-400' : 'bg-slate-800/50 border-slate-800 text-slate-500'
              }`}
            >
              {scanConfig.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                className={`h-9 w-9 flex items-center justify-center relative rounded-xl border-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                  isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center animate-bounce border border-slate-900">
                    {unreadAlerts.length}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown Modal */}
              {showAlertsDropdown && (
                <div className={`absolute right-0 mt-2 w-80 sm:w-96 border-2 rounded-2xl shadow-2xl z-50 overflow-hidden ${
                  isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}>
                  <div className={`p-3 border-b-2 flex items-center justify-between ${
                    isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-800 border-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-extrabold">Alertas da Rede</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-500 font-mono px-1.5 py-0.5 rounded-full font-bold">
                        {alerts.length}
                      </span>
                    </div>
                    {alerts.length > 0 && (
                      <button
                        onClick={() => {
                          onClearAlerts();
                          setShowAlertsDropdown(false);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-emerald-500 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Marcar lidos
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/40">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Nenhum alerta registrado até o momento.
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 text-xs ${alert.read ? 'opacity-60' : 'bg-rose-500/10 border-l-4 border-rose-500'}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-rose-500">
                              {alert.type === 'new_device' ? '🚨 Dispositivo Desconhecido' : '⚠️ Alerta de Segurança'}
                            </span>
                            <span className="text-[10px] opacity-60 font-mono">
                              {new Date(alert.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-snug">
                            {alert.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings shortcut button */}
            <button
              onClick={onOpenSettings}
              title="Configurações & Blacklist de Ignorados"
              className={`h-9 w-9 flex items-center justify-center rounded-xl border-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Sair"
              className={`h-9 w-9 flex items-center justify-center rounded-xl border-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                isLight ? 'bg-slate-100 border-slate-900 text-rose-700 hover:bg-rose-50' : 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Scan Buttons with Uniform h-9 Height */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onStartScan('quick')}
                disabled={isScanning}
                className={`h-9 flex items-center space-x-2 px-4 text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 text-white ${accentBgClass}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Varrendo...' : 'Varrer'}</span>
              </button>

              {/* Simulate New Device Trigger Button */}
              <button
                onClick={() => onStartScan('full', true)}
                disabled={isScanning}
                title="Simula a entrada de um novo dispositivo para testar alerta"
                className={`h-9 hidden sm:flex items-center space-x-1.5 px-3 text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${
                  isLight ? 'bg-amber-100 text-amber-900 border-slate-900' : 'bg-slate-800 text-amber-300 border-slate-700 hover:border-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Novo</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
