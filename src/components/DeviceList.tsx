import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Server,
  X,
  Wifi,
  Terminal,
  Zap,
  Gauge,
  ArrowRight
} from 'lucide-react';
import { Device, ThemeMode } from '../types';
import { DeviceCard } from './DeviceCard';
import { PingSparkline } from './PingSparkline';

interface DeviceListProps {
  devices: Device[];
  isScanning: boolean;
  onSelectDevice: (device: Device) => void;
  onToggleTrust: (device: Device) => void;
  onEditName: (device: Device) => void;
  onStartScan: (type: 'quick' | 'full') => void;
  onOpenSpeedtest?: () => void;
  themeMode?: ThemeMode;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  isScanning,
  onSelectDevice,
  onToggleTrust,
  onEditName,
  onStartScan,
  onOpenSpeedtest,
  themeMode = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'untrusted' | 'vulnerable' | 'online'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const isLight = themeMode === 'light';

  // Stats calculation
  const totalOnline = devices.filter((d) => d.status === 'online').length;
  const totalOpenPorts = devices.reduce((acc, dev) => acc + dev.openPorts.length, 0);
  const untrustedCount = devices.filter((d) => !d.isTrusted).length;
  const highRiskCount = devices.filter((d) => d.riskLevel === 'high' || d.riskLevel === 'critical').length;
  const avgLatency = devices.length ? Math.round(devices.reduce((acc, dev) => acc + dev.latencyMs, 0) / devices.length) : 0;

  // Filtering
  const filteredDevices = devices.filter((dev) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      dev.ip.toLowerCase().includes(query) ||
      dev.mac.toLowerCase().includes(query) ||
      dev.hostname.toLowerCase().includes(query) ||
      dev.vendor.toLowerCase().includes(query) ||
      (dev.customName && dev.customName.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterType === 'untrusted') return !dev.isTrusted;
    if (filterType === 'vulnerable') return dev.riskLevel === 'high' || dev.riskLevel === 'critical';
    if (filterType === 'online') return dev.status === 'online';

    return true;
  });

  const getLatencyBadge = (ms: number) => {
    if (ms <= 5) return { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'Excelente' };
    if (ms <= 20) return { color: 'text-sky-500 bg-sky-500/10 border-sky-500/30', label: 'Bom' };
    if (ms <= 50) return { color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', label: 'Médio' };
    return { color: 'text-rose-500 bg-rose-500/10 border-rose-500/30', label: 'Alto' };
  };

  return (
    <div className="space-y-5">
      
      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Online */}
        <div className={`p-4 rounded-2xl border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Dispositivos Online</span>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-emerald-500 mt-0.5">
              {totalOnline} <span className="text-xs font-sans text-slate-400 font-bold">/ {devices.length}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
              100% Ativos na Subnet
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Total Open Ports */}
        <div className={`p-4 rounded-2xl border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Portas Abertas</span>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-indigo-500 mt-0.5">
              {totalOpenPorts} <span className="text-xs font-sans text-slate-400 font-bold">Portas</span>
            </div>
            <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
              Serviços TCP/UDP
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border-2 border-indigo-500/30 text-indigo-500">
            <Terminal className="w-5 h-5" />
          </div>
        </div>

        {/* Untrusted / Vulnerable */}
        <div className={`p-4 rounded-2xl border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          untrustedCount > 0 || highRiskCount > 0
            ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
            : isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Não Conhecidos / Alerta</span>
            <div className="text-2xl font-extrabold font-mono tracking-tight mt-0.5">
              {untrustedCount} <span className="text-xs font-sans text-slate-400 font-bold">desconhecidos</span>
            </div>
            <span className="text-[11px] font-bold block mt-0.5">
              {highRiskCount > 0 ? `${highRiskCount} vulneráveis em risco` : 'Nenhum risco crítico'}
            </span>
          </div>
          <div className={`p-3 rounded-xl border-2 ${
            untrustedCount > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Speedtest & Average Ping */}
        <div 
          onClick={onOpenSpeedtest}
          className={`p-4 rounded-2xl border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-all hover:-translate-y-0.5 cursor-pointer group ${
            isLight ? 'bg-white hover:bg-emerald-50 border-slate-900 text-slate-900' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
          }`}
          title="Clique para abrir o Teste de Banda (Speedtest)"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Desempenho & Banda</span>
            <div className="text-xl font-extrabold font-mono tracking-tight text-emerald-500 mt-0.5 flex items-center gap-1.5">
              <span>⚡ {avgLatency} ms</span>
              <span className="text-xs font-sans font-bold text-slate-400">(Latência Média)</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 mt-0.5 group-hover:underline">
              <span>Testar Velocidade</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

      </div>
      
      {/* Search & Filter Header Bar */}
      <div className={`p-4 rounded-2xl border-2 transition-colors flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        isLight
          ? 'bg-white border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
      }`}>
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por IP (ex: 192.168.1.100), Nome ou Fabricante..."
            className={`w-full border-2 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono placeholder:font-sans font-bold transition-all ${
              isLight
                ? 'bg-slate-50 border-slate-900 text-slate-900 placeholder:text-slate-400'
                : 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
              }`}
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white border-slate-900'
                : isLight
                ? 'bg-white text-slate-900 border-slate-900 hover:bg-emerald-600 hover:text-white'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-600 hover:text-white hover:border-slate-900'
            }`}
          >
            Todos ({devices.length})
          </button>

          <button
            onClick={() => setFilterType('untrusted')}
            className={`px-3.5 py-1.5 rounded-xl font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 flex items-center gap-1.5 ${
              filterType === 'untrusted'
                ? 'bg-rose-600 text-white border-slate-900'
                : isLight
                ? 'bg-white text-slate-900 border-slate-900 hover:bg-rose-600 hover:text-white'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-rose-600 hover:text-white hover:border-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Desconhecidos ({untrustedCount})</span>
          </button>

          <button
            onClick={() => setFilterType('vulnerable')}
            className={`px-3.5 py-1.5 rounded-xl font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 flex items-center gap-1.5 ${
              filterType === 'vulnerable'
                ? 'bg-amber-500 text-slate-950 border-slate-900'
                : isLight
                ? 'bg-white text-slate-900 border-slate-900 hover:bg-amber-500 hover:text-slate-950'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-amber-500 hover:text-slate-950 hover:border-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Vulneráveis ({highRiskCount})</span>
          </button>

          <div className={`h-4 w-[2px] mx-1 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* View Mode Toggle */}
          <div className={`flex items-center border-2 rounded-xl p-0.5 ${
            isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-950 border-slate-800'
          }`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${
                viewMode === 'grid'
                  ? isLight ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualização em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${
                viewMode === 'table'
                  ? isLight ? 'bg-slate-900 text-white' : 'bg-slate-800 text-white'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {isScanning && devices.length === 0 ? (
        <div className={`border-2 rounded-2xl p-12 text-center my-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <h3 className="text-base font-extrabold">Varrendo a rede local...</h3>
          <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Utilizando varredura ARP & TCP Sockets para identificar dispositivos, endereços MAC e fabricantes conectados na sua subnet.
          </p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className={`border-2 rounded-2xl p-12 text-center my-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <Server className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-extrabold">Nenhum dispositivo encontrado</h3>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {searchTerm ? (
              <>Nenhum resultado para o termo <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">"{searchTerm}"</span></>
            ) : (
              'Tente alterar os filtros aplicados ou executar uma nova varredura da rede.'
            )}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Limpar Busca
              </button>
            )}
            <button
              onClick={() => onStartScan('quick')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Iniciar Varredura
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onSelect={onSelectDevice}
              onToggleTrust={onToggleTrust}
              onEditName={onEditName}
              themeMode={themeMode}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className={`border-2 rounded-2xl overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <table className="w-full text-left text-xs">
            <thead className={`font-mono text-[11px] uppercase border-b-2 font-extrabold ${
              isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <tr>
                <th className="px-4 py-3">Status / Nome</th>
                <th className="px-4 py-3">Endereço IP</th>
                <th className="px-4 py-3">MAC / Fabricante</th>
                <th className="px-4 py-3">Latência</th>
                <th className="px-4 py-3">Portas Abertas</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800/80 font-mono">
              {filteredDevices.map((device) => {
                const badge = getLatencyBadge(device.latencyMs);
                return (
                  <tr 
                    key={device.id} 
                    className={`transition-all ${
                      isLight 
                        ? 'hover:bg-indigo-50/70 border-b border-slate-200' 
                        : 'hover:bg-slate-800/80 border-b border-slate-800'
                    }`}
                  >
                    
                    {/* Status & Name */}
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-3 h-3 rounded-full shrink-0 border border-slate-900 ${
                          device.isTrusted ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                        }`} />
                        <div>
                          <div 
                            onClick={() => onSelectDevice(device)}
                            className={`font-extrabold cursor-pointer hover:underline ${isLight ? 'text-slate-900' : 'text-slate-200'}`}
                          >
                            {device.customName || device.hostname || device.vendor}
                          </div>
                          {!device.isTrusted && (
                            <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wide">
                              Não Reconhecido
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP */}
                    <td className={`px-4 py-3 font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      <button 
                        onClick={() => onSelectDevice(device)} 
                        className="hover:underline font-extrabold"
                      >
                        {device.ip}
                      </button>
                    </td>

                    {/* MAC & Vendor */}
                    <td className="px-4 py-3">
                      <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{device.mac}</div>
                      <div className={`text-[11px] font-sans ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{device.vendor}</div>
                    </td>

                    {/* Latency Sparkline */}
                    <td className="px-4 py-3">
                      <PingSparkline
                        pingHistory={device.pingHistory}
                        currentLatencyMs={device.latencyMs}
                        ip={device.ip}
                        isLight={isLight}
                        size="sm"
                      />
                    </td>

                    {/* Open ports */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {device.openPorts.map((p) => (
                          <span
                            key={p.port}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-extrabold font-mono ${
                              p.risk === 'critical' || p.risk === 'high'
                                ? 'bg-rose-500 text-white border-slate-900' 
                                : isLight ? 'bg-slate-200 text-slate-900 border-slate-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {p.port}
                          </span>
                        ))}
                        {device.openPorts.length === 0 && <span className="text-slate-500 italic text-[11px]">Nenhuma</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right font-sans">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onToggleTrust(device)}
                          className={`p-2 rounded-xl text-xs font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 ${
                            device.isTrusted
                              ? isLight 
                                ? 'bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 border-slate-900' 
                                : 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border-slate-700 hover:border-slate-900'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
                          }`}
                          title={device.isTrusted ? "Remover da lista de conhecidos" : "Aprovar como conhecido"}
                        >
                          {device.isTrusted ? <ShieldAlert className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onSelectDevice(device)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 bg-indigo-600 hover:bg-indigo-500 text-white border-slate-900 flex items-center gap-1`}
                        >
                          <span>Ver</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
