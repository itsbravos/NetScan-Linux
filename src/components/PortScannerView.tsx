import React, { useState } from 'react';
import { 
  Radio, 
  Play, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Terminal,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { OpenPort, RiskLevel, ThemeMode } from '../types';

interface PortScannerViewProps {
  defaultIp?: string;
  themeMode?: ThemeMode;
}

export const PortScannerView: React.FC<PortScannerViewProps> = ({
  defaultIp = '127.0.0.1',
  themeMode = 'dark',
}) => {
  const [targetIp, setTargetIp] = useState(defaultIp);
  const [scanPreset, setScanPreset] = useState<'common' | 'top100' | 'custom'>('common');
  const [customRange, setCustomRange] = useState('1-1024');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    targetIp: string;
    timestamp: string;
    scannedPortsCount: number;
    openPortsCount: number;
    ports: Array<{
      port: number;
      protocol: string;
      state: 'open' | 'closed' | 'filtered';
      service: string;
      risk: RiskLevel;
      securityNote: string;
    }>;
  } | null>(null);

  const isLight = themeMode === 'light';

  const handleStartPortScan = async () => {
    if (!targetIp) return;
    setIsScanning(true);

    let portsToScan: number[] = [];

    if (scanPreset === 'common') {
      portsToScan = [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 1433, 3306, 3389, 5432, 5900, 8080, 8443, 9000, 27017];
    } else if (scanPreset === 'top100') {
      portsToScan = Array.from({ length: 100 }, (_, i) => i + 1);
    } else {
      if (customRange.includes('-')) {
        const [start, end] = customRange.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const limit = Math.min(end - start + 1, 500);
          portsToScan = Array.from({ length: limit }, (_, i) => start + i);
        }
      } else {
        portsToScan = customRange.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      }
    }

    if (portsToScan.length === 0) {
      portsToScan = [21, 22, 80, 443, 8080];
    }

    try {
      const res = await fetch('/api/scan/port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: targetIp, ports: portsToScan }),
      });
      const data = await res.json();
      setScanResults(data);
    } catch (err) {
      console.error("Error executing port scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Control Panel */}
      <div className={`p-6 border-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-emerald-500/10 border-2 border-emerald-600 rounded-xl text-emerald-600">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold">
              Scanner de Portas Abertas (Port Scanner)
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
              Execute testes de conexão TCP Socket em portas específicas para identificar serviços e vulnerabilidades expostas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Target IP Input */}
          <div>
            <label className={`block text-xs font-mono font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Endereço IP Alvo
            </label>
            <input
              type="text"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder="ex: 192.168.1.1 ou 127.0.0.1"
              className={`w-full font-mono font-bold text-sm border-2 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-900 text-emerald-700' : 'bg-slate-950 border-slate-800 text-emerald-400'
              }`}
            />
          </div>

          {/* Preset Selector */}
          <div>
            <label className={`block text-xs font-mono font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              Amplitude de Varredura
            </label>
            <select
              value={scanPreset}
              onChange={(e) => setScanPreset(e.target.value as any)}
              className={`w-full border-2 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <option value="common">Portas Mais Comuns (20 portas essenciais)</option>
              <option value="top100">Primeiras 100 Portas (1-100)</option>
              <option value="custom">Amplitude Personalizada</option>
            </select>
          </div>

          {/* Custom Range or Action Button */}
          {scanPreset === 'custom' ? (
            <div>
              <label className={`block text-xs font-mono font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Faixa de Portas
              </label>
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="ex: 1-1024 ou 80,443,8080"
                className={`w-full border-2 font-mono text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isLight ? 'bg-slate-50 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
              />
            </div>
          ) : (
            <div className="flex items-end">
              <button
                onClick={handleStartPortScan}
                disabled={isScanning || !targetIp}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all ${
                  isScanning
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:translate-y-0.5'
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inspecionando Portas...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar Teste de Portas</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {scanPreset === 'custom' && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleStartPortScan}
              disabled={isScanning || !targetIp}
              className={`py-2 px-6 rounded-xl text-xs font-extrabold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all ${
                isScanning
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>Iniciar Teste</span>
            </button>
          </div>
        )}
      </div>

      {/* Results View */}
      {scanResults && (
        <div className={`p-6 border-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 transition-colors ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b-2 pb-4 ${
            isLight ? 'border-slate-300' : 'border-slate-800'
          }`}>
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span>Resultado da Varredura para</span>
                <span className={`font-mono font-extrabold px-2 py-0.5 rounded border-2 ${
                  isLight ? 'bg-slate-100 text-emerald-800 border-slate-900' : 'bg-slate-950 text-emerald-400 border-slate-800'
                }`}>
                  {scanResults.targetIp}
                </span>
              </h3>
              <p className={`text-xs mt-0.5 font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Mapeamento concluído em {new Date(scanResults.timestamp).toLocaleTimeString("pt-BR")}. Total de portas verificadas: {scanResults.scannedPortsCount}.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono font-bold">
              <span className={`px-2.5 py-1 rounded border-2 ${
                isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-800' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {scanResults.openPortsCount} Portas Abertas
              </span>
              <span className={`px-2.5 py-1 rounded border-2 ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-900' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {scanResults.scannedPortsCount - scanResults.openPortsCount} Fechadas
              </span>
            </div>
          </div>

          {/* Open / Closed Ports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scanResults.ports.map((p) => {
              const isOpen = p.state === 'open';

              return (
                <div
                  key={p.port}
                  className={`p-3.5 rounded-xl border-2 flex flex-col justify-between space-y-2 ${
                    isOpen
                      ? p.risk === 'critical'
                        ? isLight ? 'bg-rose-100 border-rose-600 text-slate-900' : 'bg-rose-950/40 border-rose-600 text-slate-100'
                        : p.risk === 'high'
                        ? isLight ? 'bg-amber-100 border-amber-600 text-slate-900' : 'bg-amber-950/40 border-amber-600 text-slate-100'
                        : isLight ? 'bg-emerald-50 border-emerald-600 text-slate-900' : 'bg-emerald-950/30 border-emerald-600 text-slate-100'
                      : isLight ? 'bg-slate-100 border-slate-300 opacity-70' : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono text-sm font-extrabold ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                        Porta {p.port}
                      </span>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-bold border ${
                        isLight ? 'bg-slate-200 text-slate-900 border-slate-900' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {p.protocol}
                      </span>
                    </div>

                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border-2 flex items-center gap-1 ${
                      isOpen
                        ? isLight ? 'bg-emerald-600 text-white border-slate-900' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isLight ? 'bg-slate-200 text-slate-700 border-slate-900' : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      {isOpen ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-slate-500" />}
                      {isOpen ? 'Aberta' : 'Fechada'}
                    </span>
                  </div>

                  <div>
                    <span className={`font-extrabold text-xs block ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Serviço: {p.service}
                    </span>
                    <p className={`text-[11px] mt-1 leading-relaxed font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                      {p.securityNote}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
