import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Terminal, 
  Check, 
  Edit3, 
  Save, 
  Lock, 
  Unlock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Device, OpenPort, ThemeMode } from '../types';
import { getDeviceIcon } from './DeviceCard';
import { PingSparkline } from './PingSparkline';

interface DeviceModalProps {
  device: Device | null;
  onClose: () => void;
  onToggleTrust: (device: Device) => void;
  onUpdateDeviceDetails: (mac: string, customName: string, notes: string) => void;
  onOpenNmapWithTarget: (ip: string) => void;
  themeMode?: ThemeMode;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  device,
  onClose,
  onToggleTrust,
  onUpdateDeviceDetails,
  onOpenNmapWithTarget,
  themeMode = 'dark',
}) => {
  if (!device) return null;

  const [customNameInput, setCustomNameInput] = useState(device.customName || '');
  const [notesInput, setNotesInput] = useState(device.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  const isLight = themeMode === 'light';

  const handleSaveDetails = () => {
    onUpdateDeviceDetails(device.mac, customNameInput, notesInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      
      <div className={`rounded-2xl max-w-2xl w-full overflow-hidden my-8 transition-colors ${
        isLight
          ? 'bg-white border-2 border-slate-900 text-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl'
      }`}>
        
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b-2 flex items-center justify-between ${
          isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border-2 ${
              !device.isTrusted
                ? isLight ? 'bg-rose-100 border-rose-600' : 'bg-rose-500/20 border-rose-500'
                : isLight ? 'bg-white border-slate-900' : 'bg-slate-800 border-slate-700'
            }`}>
              {getDeviceIcon(device.deviceType)}
            </div>
            <div>
              <h3 className={`font-extrabold text-base flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <span>{device.customName || device.hostname || device.vendor}</span>
                {!device.isTrusted && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white border-2 border-slate-900">
                    Desconhecido
                  </span>
                )}
              </h3>
              <p className={`text-xs font-mono font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {device.ip || 'Sem IPv4'} ({device.mac})
              </p>
              {!!device.ipv6?.length && (
                <p className={`text-[10px] font-mono truncate max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`} title={device.ipv6.join(', ')}>
                  IPv6: {device.ipv6[0]}{device.ipv6.length > 1 ? ` +${device.ipv6.length - 1}` : ''}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border-2 font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 ${
              isLight 
                ? 'bg-white hover:bg-rose-500 hover:text-white hover:border-slate-900 text-slate-900 border-slate-900' 
                : 'bg-slate-800 hover:bg-rose-600 hover:text-white hover:border-slate-900 text-slate-300 border-slate-700'
            }`}
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className={`p-3 rounded-xl border-2 ${
              isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}>
              <span className={`text-[10px] uppercase font-extrabold block ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Latência Ping</span>
              <span className={`font-extrabold text-sm flex items-center gap-1 mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                {device.latencyMs >= 0 ? `${device.latencyMs} ms` : '—'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 ${
              isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}>
              <span className={`text-[10px] uppercase font-extrabold block ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Fabricante</span>
              <span className="font-bold truncate block mt-0.5" title={device.vendor}>
                {device.vendor}
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 ${
              isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}>
              <span className={`text-[10px] uppercase font-extrabold block ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Primeira Detecção</span>
              <span className="block mt-0.5 text-[11px] font-semibold">
                {new Date(device.firstSeen).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 ${
              isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}>
              <span className={`text-[10px] uppercase font-extrabold block ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Risco Estimado</span>
              <span className={`font-bold block mt-0.5 text-[11px] ${
                device.riskLevel === 'critical' ? 'text-rose-600 font-extrabold' : device.riskLevel === 'high' ? 'text-amber-600 font-extrabold' : 'text-emerald-600 font-extrabold'
              }`}>
                {device.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Ping Sparkline Chart (Last 10 pings) */}
          <div>
            <PingSparkline
              pingHistory={device.pingHistory}
              currentLatencyMs={device.latencyMs}
              ip={device.ip}
              isLight={isLight}
              size="lg"
            />
          </div>
          <div className={`p-4 rounded-2xl border-2 space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950/60 border-slate-800 text-slate-100'
          }`}>
            <h4 className="font-extrabold text-xs flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Personalizar Apelido e Anotações</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] mb-1 font-mono font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Apelido do Dispositivo
                </label>
                <input
                  type="text"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="ex: Celular do Pedro ou TV da Sala"
                  className={`w-full border-2 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans font-semibold transition-all ${
                    isLight ? 'bg-white border-slate-900 text-slate-900 focus:bg-emerald-50/30' : 'bg-slate-900 border-slate-700 text-slate-200 focus:bg-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] mb-1 font-mono font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Notas de Identificação
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="ex: IP Estático configurado no DHCP"
                  className={`w-full border-2 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans font-semibold transition-all ${
                    isLight ? 'bg-white border-slate-900 text-slate-900 focus:bg-emerald-50/30' : 'bg-slate-900 border-slate-700 text-slate-200 focus:bg-slate-950'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveDetails}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                  isSaved
                    ? 'bg-emerald-500 text-white border-slate-900'
                    : isLight
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Salvo!' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>

          {/* Open Ports List */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className={`font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Portas Abertas Encontradas ({device.openPorts.length})</span>
              </h4>

              <button
                onClick={() => {
                  onClose();
                  onOpenNmapWithTarget(device.ip);
                }}
                className={`px-3 py-1.5 text-[11px] font-mono font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                  isLight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-slate-900'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Abrir Terminal Nmap ({device.ip}) →</span>
              </button>
            </div>

            {device.openPorts.length === 0 ? (
              <div className={`p-4 border-2 rounded-xl text-xs italic text-center font-medium ${
                isLight ? 'bg-slate-50 border-slate-900 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                Nenhuma porta de serviço padrão encontrada aberta neste host.
              </div>
            ) : (
              <div className={`border-2 rounded-xl overflow-hidden divide-y-2 ${
                isLight ? 'bg-slate-50 border-slate-900 divide-slate-300' : 'bg-slate-950 border-slate-800 divide-slate-800'
              }`}>
                {device.openPorts.map((p) => (
                  <div key={p.port} className={`p-3 flex items-start justify-between gap-3 text-xs transition-colors ${
                    isLight ? 'hover:bg-slate-100/90' : 'hover:bg-slate-900/90'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`font-extrabold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Porta {p.port}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          isLight ? 'bg-slate-200 text-slate-900 border-slate-900' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {p.protocol.toUpperCase()}
                        </span>
                        <span className={`font-sans font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                          {p.service}
                        </span>
                      </div>
                      {p.securityNote && (
                        <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {p.securityNote}
                        </p>
                      )}
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-extrabold shrink-0 border-2 ${
                      p.risk === 'critical' ? 'bg-rose-500 text-white border-slate-900' :
                      p.risk === 'high' ? 'bg-amber-400 text-slate-950 border-slate-900' :
                      isLight ? 'bg-slate-200 text-slate-900 border-slate-900' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {p.risk}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t-2 flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-950 border-slate-800'
        }`}>
          <button
            onClick={() => onToggleTrust(device)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 ${
              device.isTrusted
                ? isLight
                  ? 'bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-900 border-slate-900'
                  : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border-slate-700 hover:border-slate-900'
                : isLight
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
            }`}
          >
            {device.isTrusted ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{device.isTrusted ? 'Remover dos Conhecidos' : 'Marcar como Conhecido / Confiável'}</span>
          </button>

          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isLight ? 'bg-white hover:bg-slate-200 text-slate-900 border-slate-900' : 'bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 border-slate-700'
            }`}
          >
            Fechar
          </button>
        </div>

      </div>

    </div>
  );
};
