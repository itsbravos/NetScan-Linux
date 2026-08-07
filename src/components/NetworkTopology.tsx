import React from 'react';
import { 
  Wifi, 
  Laptop, 
  Smartphone, 
  Tv, 
  Printer, 
  Cpu, 
  Server, 
  Camera, 
  Radio, 
  ShieldAlert, 
  ShieldCheck,
  Activity
} from 'lucide-react';
import { Device, ThemeMode } from '../types';
import { getDeviceIcon } from './DeviceCard';

interface NetworkTopologyProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  themeMode?: ThemeMode;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  devices,
  onSelectDevice,
  themeMode = 'dark',
}) => {
  const isLight = themeMode === 'light';

  const routerDevice = devices.find((d) => d.deviceType === 'router') || {
    id: 'gateway-default',
    ip: '192.168.1.1',
    mac: 'a4:12:42:89:11:01',
    hostname: 'router.gateway',
    vendor: 'TP-Link / Gateway',
    deviceType: 'router' as const,
    status: 'online' as const,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    isTrusted: true,
    openPorts: [],
    riskLevel: 'safe' as const,
    latencyMs: 1,
  };

  const clientDevices = devices.filter((d) => d.id !== routerDevice.id);

  return (
    <div className={`border-2 rounded-2xl p-6 relative overflow-hidden transition-colors ${
      isLight
        ? 'bg-white border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
    }`}>
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(#10b981 1px, transparent 1px)`,
          backgroundSize: `24px 24px`
        }} 
      />

      <div className="relative z-10 space-y-6">
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b-2 pb-4 ${
          isLight ? 'border-slate-300' : 'border-slate-800/80'
        }`}>
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-600" />
              <span>Mapa da Topologia de Rede Local</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
              Visualização gráfica das conexões ativas na subnet local
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-900" />
              <span>Conhecido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-slate-900 animate-ping" />
              <span className="text-rose-600 font-extrabold">Desconhecido</span>
            </div>
          </div>
        </div>

        {/* Topology Central Diagram */}
        <div className="py-8 px-4 flex flex-col items-center">
          
          {/* Central Router / Gateway Node */}
          <div 
            onClick={() => onSelectDevice(routerDevice as Device)}
            className="relative flex flex-col items-center group cursor-pointer"
            title="Clique para ver Detalhes / Nmap do Roteador"
          >
            <div className={`w-20 h-20 rounded-2xl border-2 border-emerald-600 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-105 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              isLight ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-slate-900 hover:bg-slate-800'
            }`}>
              <Wifi className="w-10 h-10 text-emerald-600 animate-pulse" />
            </div>
            <div className="mt-2 text-center">
              <span className="font-extrabold text-xs text-emerald-600 font-mono block group-hover:underline">
                {routerDevice.ip}
              </span>
              <span className="text-[11px] font-extrabold block">
                {routerDevice.customName || routerDevice.hostname || "Roteador Principal"}
              </span>
              <span className={`text-[10px] font-mono font-bold block ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                {routerDevice.mac}
              </span>
            </div>

            {/* Glowing Ring Effect */}
            <div className="absolute -inset-2 rounded-3xl border-2 border-emerald-500/30 pointer-events-none animate-ping opacity-25" />
          </div>

          {/* Connection Lines Branching Down */}
          <div className="w-full max-w-4xl my-6 flex flex-col items-center">
            {/* Vertical Main Trunk */}
            <div className="w-0.5 h-8 bg-emerald-600" />
            
            {/* Horizontal Distribution Line */}
            <div className={`w-full h-0.5 relative ${isLight ? 'bg-slate-900' : 'bg-slate-700'}`}>
              <div className={`absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 rounded-full border-2 border-emerald-500 ${
                isLight ? 'bg-white' : 'bg-slate-800'
              }`} />
            </div>
          </div>

          {/* Connected Client Nodes Grid */}
          <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {clientDevices.map((device) => {
              const isUnknown = !device.isTrusted;

              return (
                <div
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
                  className={`group relative border-2 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    isLight
                      ? isUnknown
                        ? 'border-rose-600 bg-rose-50 text-slate-900'
                        : 'border-slate-900 bg-slate-50 hover:bg-white text-slate-900'
                      : isUnknown
                        ? 'border-rose-500 bg-rose-950/30 hover:border-rose-400 text-slate-100'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 text-slate-100'
                  }`}
                >
                  {/* Icon container */}
                  <div className={`p-3 rounded-xl border-2 mb-2 transition-transform group-hover:scale-110 ${
                    isUnknown
                      ? isLight ? 'bg-rose-100 border-rose-600' : 'bg-rose-500/20 border-rose-500'
                      : isLight ? 'bg-white border-slate-900' : 'bg-slate-900 border-slate-800'
                  }`}>
                    {getDeviceIcon(device.deviceType)}
                  </div>

                  {/* Device Info */}
                  <span className="font-extrabold text-xs truncate w-full px-1">
                    {device.customName || device.hostname || device.vendor}
                  </span>

                  <span className={`font-mono text-[11px] font-bold mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {device.ip}
                  </span>

                  <span className={`text-[10px] font-medium truncate w-full mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    {device.vendor}
                  </span>

                  {/* Status Badge */}
                  <div className="mt-2 flex items-center justify-center gap-1 w-full">
                    {isUnknown ? (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white border-2 border-slate-900 flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Desconhecido
                      </span>
                    ) : (
                      <span className={`text-[9px] font-mono font-bold flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-emerald-400'}`}>
                        <Activity className="w-2.5 h-2.5 text-sky-500" />
                        {device.latencyMs >= 0 ? `${device.latencyMs} ms` : '—'}
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
