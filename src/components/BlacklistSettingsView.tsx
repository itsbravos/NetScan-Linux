import React, { useState, useEffect } from 'react';
import { 
  ShieldX, 
  Plus, 
  Trash2, 
  Palette, 
  Sun, 
  Moon, 
  Info, 
  Check, 
  Sparkles, 
  Sliders,
  MousePointerClick
} from 'lucide-react';
import { IgnoredDevice, ThemeConfig, ThemeMode, AccentColor } from '../types';

interface BlacklistSettingsViewProps {
  themeConfig: ThemeConfig;
  onUpdateTheme: (config: Partial<ThemeConfig>) => void;
  accentBgClass: string;
}

export const BlacklistSettingsView: React.FC<BlacklistSettingsViewProps> = ({
  themeConfig,
  onUpdateTheme,
  accentBgClass,
}) => {
  const [blacklist, setBlacklist] = useState<IgnoredDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMacOrIp, setNewMacOrIp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blacklist');
      const data = await res.json();
      if (data.blacklist) {
        setBlacklist(data.blacklist);
      }
    } catch (err) {
      console.error("Error fetching blacklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacOrIp.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macOrIp: newMacOrIp.trim(),
          label: newLabel.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Dispositivo "${newMacOrIp}" adicionado à lista de ignorados com sucesso!`);
        setNewMacOrIp('');
        setNewLabel('');
        fetchBlacklist();
      } else {
        setErrorMsg(data.error || 'Erro ao adicionar item à blacklist.');
      }
    } catch (err) {
      console.error("Error adding to blacklist:", err);
      setErrorMsg('Falha na comunicação com o servidor.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blacklist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBlacklist((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting from blacklist:", err);
    }
  };

  const isLight = themeConfig.mode === 'light';

  const accentOptions: Array<{ id: AccentColor; name: string; hex: string; bgClass: string }> = [
    { id: 'blue', name: 'Azul Flipo', hex: '#0284c7', bgClass: 'bg-sky-500' },
    { id: 'emerald', name: 'Verde Esmeralda', hex: '#10b981', bgClass: 'bg-emerald-500' },
    { id: 'indigo', name: 'Índigo', hex: '#6366f1', bgClass: 'bg-indigo-500' },
    { id: 'amber', name: 'Âmbar Dourado', hex: '#f59e0b', bgClass: 'bg-amber-500' },
    { id: 'coral', name: 'Rosa Coral', hex: '#f43f5e', bgClass: 'bg-rose-500' },
    { id: 'purple', name: 'Roxo Místico', hex: '#a855f7', bgClass: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Visual Customization & Theme Panel */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-6 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        
        <div className="flex items-center space-x-3 border-b pb-4 border-slate-800/40">
          <div className={`p-3 border-2 border-slate-900 rounded-xl text-white ${accentBgClass}`}>
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <span>Personalização de Aparência & Estilo</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-500 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                Efeito Tactil Neo-Brutalista
              </span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Alterne entre Modo Claro/Escuro, escolha a cor principal da interface e experimente o efeito tátil de botão.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Light / Dark Mode Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Modo de Exibição
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateTheme({ mode: 'light' })}
                className={`btn-neo p-3 flex items-center justify-center gap-2 text-xs font-bold ${
                  themeConfig.mode === 'light'
                    ? 'bg-amber-400 text-slate-950 border-slate-900 ring-2 ring-amber-400/50'
                    : isLight
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-600" />
                <span>Modo Claro</span>
                {themeConfig.mode === 'light' && <Check className="w-3.5 h-3.5 ml-auto text-slate-950" />}
              </button>

              <button
                onClick={() => onUpdateTheme({ mode: 'dark' })}
                className={`btn-neo p-3 flex items-center justify-center gap-2 text-xs font-bold ${
                  themeConfig.mode === 'dark'
                    ? 'bg-slate-950 text-white border-slate-700 ring-2 ring-emerald-500/50'
                    : isLight
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Modo Escuro</span>
                {themeConfig.mode === 'dark' && <Check className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Primary Accent Color Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Cor Principal da Interface
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {accentOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateTheme({ accent: opt.id })}
                  title={opt.name}
                  className={`btn-neo p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    themeConfig.accent === opt.id
                      ? 'ring-2 ring-slate-900 dark:ring-white scale-105'
                      : 'opacity-80 hover:opacity-100'
                  } ${isLight ? 'bg-slate-50' : 'bg-slate-800 border-slate-700'}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 border-slate-900 ${opt.bgClass} shadow-sm`} />
                  <span className="text-[10px] font-bold truncate max-w-full">
                    {opt.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Tactile Button Hover Displacement Demonstration */}
        <div className={`p-4 border-2 border-dashed rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center space-x-3">
            <MousePointerClick className="w-5 h-5 text-amber-500 animate-bounce" />
            <div>
              <span className="text-xs font-extrabold block">Teste de Efeito de Botão (Hover Elevation)</span>
              <span className="text-[11px] text-slate-400">
                Passe o cursor sobre os botões para ver o deslocamento tátil com sombra projetada.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className={`btn-neo px-4 py-2 text-xs text-white ${accentBgClass}`}>
              Botão Principal
            </button>
            <button className={`btn-neo px-4 py-2 text-xs ${isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100 border-slate-700'}`}>
              Botão Secundário
            </button>
          </div>
        </div>

      </div>

      {/* Blacklist / Ignore List Management Section */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-6 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        
        <div className="flex items-center space-x-3 border-b pb-4 border-slate-800/40">
          <div className="p-3 bg-rose-500/10 border-2 border-rose-500/30 rounded-xl text-rose-500">
            <ShieldX className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <span>Lista de Dispositivos Ignorados (Blacklist / Isenção)</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-500 font-mono px-2 py-0.5 rounded border border-rose-500/30 font-bold">
                {blacklist.length} {blacklist.length === 1 ? 'item' : 'itens'}
              </span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Dispositivos com IP ou MAC nesta lista nunca serão marcados como desconhecidos nem emitirão alertas sonoros/visuais.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className={`p-4 border-2 rounded-xl text-xs flex items-start gap-3 ${
          isLight ? 'bg-blue-50 border-blue-900 text-blue-900' : 'bg-blue-950/40 border-blue-800 text-blue-200'
        }`}>
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Como funciona a lista de ignorados?</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Quando um scanner de rede encontra um endereço IP (ex: <code>192.168.1.210</code>) ou endereço MAC (ex: <code>98:ed:5c:22:90:7f</code>) presente nesta lista, o sistema desativa automaticamente os alertas de invasor/desconhecido para ele. Útil para placas de teste ESP32, máquinas virtuais ou dispositivos convidados.
            </p>
          </div>
        </div>

        {/* Form to Add New IP/MAC */}
        <form onSubmit={handleAdd} className={`p-4 border-2 rounded-xl space-y-3 ${
          isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-500" />
            Adicionar Novo IP ou MAC para Ignorar
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Endereço IP ou MAC *
              </label>
              <input
                type="text"
                placeholder="Ex: 192.168.1.189 ou aa:bb:cc:dd:ee:ff"
                value={newMacOrIp}
                onChange={(e) => setNewMacOrIp(e.target.value)}
                className={`w-full text-xs font-mono px-3 py-2 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Identificação / Rótulo (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Câmera de Teste ESP32"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className={`w-full text-xs px-3 py-2 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              />
            </div>

            <div className="sm:col-span-1 flex items-end">
              <button
                type="submit"
                className={`btn-neo w-full text-xs py-2 flex items-center justify-center gap-1.5 text-white ${accentBgClass}`}
              >
                <Plus className="w-4 h-4" />
                <span>Ignorar Dispositivo</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-500 font-bold pt-1">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-500 font-bold pt-1">
              ✅ {successMsg}
            </div>
          )}
        </form>

        {/* Table of Ignored Devices */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Itens Ignorados Atuais ({blacklist.length})
          </h3>

          {blacklist.length === 0 ? (
            <div className={`p-8 text-center text-xs rounded-xl border-2 border-dashed ${
              isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
            }`}>
              Nenhum IP ou MAC cadastrado na lista de ignorados no momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40 border-2 rounded-xl overflow-hidden border-slate-900 dark:border-slate-800">
              {blacklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="p-2 bg-rose-500/10 text-rose-500 rounded-lg font-mono font-bold">
                      {item.macOrIp.includes(':') ? 'MAC' : 'IP'}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-sm block">
                        {item.macOrIp}
                      </span>
                      <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.label || 'Sem descrição'} • Cadastrado em {new Date(item.addedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn-neo p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/30 transition-colors"
                    title="Remover da lista de ignorados"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
