import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Plus, 
  Download, 
  Upload, 
  Check, 
  Search,
  Server
} from 'lucide-react';
import { Device, ThemeMode } from '../types';

interface TrustedDevicesViewProps {
  devices: Device[];
  onToggleTrust: (device: Device) => void;
  onEditName: (device: Device) => void;
  themeMode?: ThemeMode;
}

export const TrustedDevicesView: React.FC<TrustedDevicesViewProps> = ({
  devices,
  onToggleTrust,
  onEditName,
  themeMode = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isLight = themeMode === 'light';
  const trustedList = devices.filter((d) => d.isTrusted);

  const filteredTrusted = trustedList.filter((dev) => {
    const q = searchTerm.toLowerCase();
    return (
      dev.ip.toLowerCase().includes(q) ||
      dev.mac.toLowerCase().includes(q) ||
      dev.vendor.toLowerCase().includes(q) ||
      (dev.customName && dev.customName.toLowerCase().includes(q))
    );
  });

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trustedList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dispositivos_conhecidos_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`p-6 rounded-2xl border-2 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isLight
          ? 'bg-white border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 border-2 border-emerald-600 rounded-xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold">
              Dispositivos Conhecidos (Whitelist)
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
              Gerencie a lista de dispositivos confiáveis na sua rede local. Dispositivos nesta lista não geram alertas de intrusão.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportJSON}
          disabled={trustedList.length === 0}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 flex items-center gap-1.5 transition-colors shrink-0 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-900'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Whitelist (JSON)</span>
        </button>
      </div>

      {/* Search & List */}
      <div className={`p-6 rounded-2xl border-2 transition-colors space-y-4 ${
        isLight
          ? 'bg-white border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
      }`}>
        
        <div className="relative max-w-md">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar dispositivos aprovados..."
            className={`w-full border-2 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold ${
              isLight
                ? 'bg-slate-50 border-slate-900 text-slate-900 placeholder:text-slate-400'
                : 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500'
            }`}
          />
        </div>

        {filteredTrusted.length === 0 ? (
          <div className={`p-8 text-center text-xs border-2 border-dashed rounded-xl font-medium ${
            isLight ? 'border-slate-300 text-slate-600' : 'border-slate-800 text-slate-500'
          }`}>
            Nenhum dispositivo aprovado encontrado com os filtros atuais.
          </div>
        ) : (
          <div className={`border-2 rounded-xl overflow-hidden divide-y-2 ${
            isLight ? 'border-slate-900 divide-slate-300' : 'border-slate-800 divide-slate-800'
          }`}>
            {filteredTrusted.map((dev) => (
              <div
                key={dev.id}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                  isLight ? 'bg-slate-50/50 hover:bg-slate-100' : 'bg-slate-950/40 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 border-2 border-emerald-600 rounded-lg text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs">
                        {dev.customName || dev.hostname || dev.vendor}
                      </h4>
                      <button
                        onClick={() => onEditName(dev)}
                        className={`p-0.5 rounded cursor-pointer ${
                          isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Editar apelido"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className={`text-[11px] font-mono mt-0.5 font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      IP: <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>{dev.ip}</span> | MAC: {dev.mac} ({dev.vendor})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    onClick={() => onToggleTrust(dev)}
                    className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-rose-500 text-white border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Confiança</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
