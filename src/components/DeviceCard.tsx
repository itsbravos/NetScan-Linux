import React from 'react';
import { 
  Laptop, 
  Smartphone, 
  Tv, 
  Printer, 
  Cpu, 
  Server, 
  Camera, 
  Wifi, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  MoreVertical,
  Activity,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ShieldX,
  Zap
} from 'lucide-react';
import { Device, DeviceType, ThemeMode } from '../types';
import { PingSparkline } from './PingSparkline';

interface DeviceCardProps {
  device: Device;
  onSelect: (device: Device) => void;
  onToggleTrust: (device: Device) => void;
  onEditName: (device: Device) => void;
  themeMode?: ThemeMode;
}

export const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case 'router':
      return <Wifi className="w-5 h-5 text-indigo-500" />;
    case 'desktop':
    case 'laptop':
      return <Laptop className="w-5 h-5 text-blue-500" />;
    case 'mobile':
      return <Smartphone className="w-5 h-5 text-emerald-500" />;
    case 'smart_tv':
      return <Tv className="w-5 h-5 text-purple-500" />;
    case 'printer':
      return <Printer className="w-5 h-5 text-amber-500" />;
    case 'server':
      return <Server className="w-5 h-5 text-teal-500" />;
    case 'camera':
      return <Camera className="w-5 h-5 text-rose-500" />;
    case 'iot':
      return <Cpu className="w-5 h-5 text-amber-500" />;
    default:
      return <Radio className="w-5 h-5 text-slate-500" />;
  }
};

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onSelect,
  onToggleTrust,
  onEditName,
  themeMode = 'dark',
}) => {
  const isUnknown = !device.isTrusted && !device.isIgnored;
  const isIgnored = device.isIgnored;
  const displayName = device.customName || device.hostname || device.vendor;
  const isLight = themeMode === 'light';

  return (
    <div
      className={`relative border-2 rounded-2xl p-4 transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:scale-[1.015] flex flex-col justify-between ${
        isLight
          ? isUnknown
            ? 'border-rose-600 bg-white text-slate-900'
            : isIgnored
            ? 'border-slate-400 bg-slate-100 text-slate-800 opacity-90'
            : 'border-slate-900 bg-white text-slate-900'
          : isUnknown
            ? 'border-rose-600 bg-slate-900 text-slate-100'
            : isIgnored
            ? 'border-slate-700 bg-slate-900/60 opacity-90 text-slate-200'
            : 'border-slate-800 bg-slate-900/95 text-slate-100'
      }`}
    >
      {/* Top row: Icon, Name/Hostname, Status badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2.5 rounded-xl border-2 shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-950 border-slate-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}>
              {getDeviceIcon(device.deviceType)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-sm truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={displayName}>
                  {displayName}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditName(device);
                  }}
                  className={`p-0.5 rounded cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-100'
                  }`}
                  title="Editar nome ou notas do dispositivo"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className={`text-xs truncate ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                {device.vendor}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isUnknown ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-900 text-rose-500 border-2 border-rose-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                Desconhecido
              </span>
            ) : isIgnored ? (
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                isLight ? 'bg-slate-200 border-slate-900 text-slate-800' : 'bg-slate-800 text-slate-300 border-slate-600'
              }`}>
                <ShieldX className="w-3.5 h-3.5 text-rose-500" />
                Ignorado
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                isLight ? 'bg-emerald-100 border-slate-900 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Conhecido
              </span>
            )}
          </div>

        </div>

        {/* Network Metadata: IP, MAC, Latency */}
        <div className={`mt-4 grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-xl border-2 ${
          isLight ? 'bg-slate-100/90 border-slate-900 text-slate-900' : 'bg-slate-950/70 border-slate-800 text-slate-100'
        }`}>
          <div>
            <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Endereço IP</span>
            <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{device.ip}</span>
          </div>

          <div>
            <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Endereço MAC</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{device.mac}</span>
          </div>

          <div>
            <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>OS Guess</span>
            <span className={`truncate block text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`} title={device.osGuess || "Desconhecido"}>
              {device.osGuess ? device.osGuess.split('/')[0] : "Linux / Embedded"}
            </span>
          </div>

          <div>
            <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Portas Abertas</span>
            <span className={`truncate block text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              {device.openPorts.length} porta(s)
            </span>
          </div>
        </div>

        {/* Sparkline do Histórico de Ping (10 pings) */}
        <div className="mt-2.5">
          <PingSparkline
            pingHistory={device.pingHistory}
            currentLatencyMs={device.latencyMs}
            ip={device.ip}
            isLight={isLight}
            size="md"
          />
        </div>

        {/* Open Ports Badges */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-bold text-[11px] flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Portas Abertas
              <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>({device.openPorts.length})</span>
            </span>
            {device.riskLevel === 'critical' && (
              <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risco Crítico
              </span>
            )}
            {device.riskLevel === 'high' && (
              <span className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risco Alto
              </span>
            )}
          </div>

          {device.openPorts.length === 0 ? (
            <span className={`text-[11px] italic block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              Nenhuma porta comum aberta identificada.
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {device.openPorts.map((p) => {
                let badgeStyle = isLight 
                  ? "bg-slate-200 text-slate-900 border-slate-900" 
                  : "bg-slate-800 text-slate-300 border-slate-700";

                if (p.risk === 'critical') badgeStyle = "bg-rose-500 text-white border-slate-900";
                else if (p.risk === 'high') badgeStyle = "bg-amber-400 text-slate-950 border-slate-900";
                else if (p.risk === 'medium') badgeStyle = "bg-yellow-300 text-slate-950 border-slate-900";

                return (
                  <span
                    key={p.port}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border-2 font-bold ${badgeStyle}`}
                    title={`${p.service} (${p.protocol.toUpperCase()}) - ${p.securityNote}`}
                  >
                    {p.port} ({p.service})
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions with Tactile Buttons */}
      <div className={`mt-4 pt-3 border-t-2 flex items-center justify-between gap-2 ${
        isLight ? 'border-slate-300' : 'border-slate-800'
      }`}>
        <button
          onClick={() => onToggleTrust(device)}
          className={`py-1.5 px-3 text-xs font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 hover:scale-[1.03] active:translate-y-0 ${
            device.isTrusted
              ? isLight
                ? 'bg-white hover:bg-rose-600 hover:text-white text-slate-900 border-slate-900'
                : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 border-slate-700 hover:border-slate-900'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
          }`}
        >
          {device.isTrusted ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Remover Confiança</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Aprovar Dispositivo</span>
            </>
          )}
        </button>

        <button
          onClick={() => onSelect(device)}
          className={`py-1.5 px-3 text-xs font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-[1.03] active:translate-y-0 ${
            isLight
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-slate-900'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-slate-900'
          }`}
        >
          Detalhes / Nmap
        </button>
      </div>

    </div>
  );
};
