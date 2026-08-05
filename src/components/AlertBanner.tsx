import React from 'react';
import { ShieldAlert, UserCheck, Eye, Sparkles } from 'lucide-react';
import { Device, ThemeMode } from '../types';

interface AlertBannerProps {
  untrustedDevices: Device[];
  onApproveAll: () => void;
  onInspect: (device: Device) => void;
  themeMode?: ThemeMode;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  untrustedDevices,
  onApproveAll,
  onInspect,
  themeMode = 'dark',
}) => {
  if (untrustedDevices.length === 0) return null;

  const latestDevice = untrustedDevices[0];
  const isLight = themeMode === 'light';

  return (
    <div className={`px-4 py-3 shadow-md animate-fade-in border-b-2 ${
      isLight
        ? 'bg-rose-100 border-rose-600 text-rose-950'
        : 'bg-rose-950/90 border-rose-800 text-rose-100'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-500 text-white rounded-xl border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-sm ${isLight ? 'text-rose-950' : 'text-rose-200'}`}>
                🚨 ALERTA: {untrustedDevices.length} {untrustedDevices.length === 1 ? 'dispositivo desconhecido detectado!' : 'dispositivos desconhecidos detectados!'}
              </span>
              <span className="text-[10px] uppercase font-mono bg-rose-500 text-white px-2 py-0.5 rounded border-2 border-slate-900 font-extrabold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                Ação Recomendada
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-mono font-bold ${isLight ? 'text-rose-800' : 'text-rose-300'}`}>
              IP: {latestDevice.ip} | MAC: {latestDevice.mac} | Fabricante: <span className="font-extrabold underline">{latestDevice.vendor}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => onInspect(latestDevice)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-900'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspecionar Dispositivo</span>
          </button>

          <button
            onClick={onApproveAll}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Aprovar Todos ({untrustedDevices.length})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
