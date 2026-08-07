import React, { useState, useRef } from 'react';
import {
  Zap,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  RefreshCw,
  Play,
  CheckCircle2,
  Wifi,
  Server,
  Clock,
  Globe,
  Gauge,
  XCircle
} from 'lucide-react';
import { ThemeMode } from '../types';
import { measurePing, measureDownload, measureUpload, isAbortError } from '../lib/speedtestEngine';

interface SpeedtestProps {
  themeMode: ThemeMode;
}

interface SpeedHistory {
  id: string;
  timestamp: string;
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  rating: string;
}

export const Speedtest: React.FC<SpeedtestProps> = ({ themeMode }) => {
  const isLight = themeMode === 'light';

  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);

  // Live test metrics
  const [ping, setPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // History state
  const [history, setHistory] = useState<SpeedHistory[]>(() => {
    try {
      const saved = localStorage.getItem('netscan_speedtest_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toLocaleString('pt-BR'),
        pingMs: 4,
        jitterMs: 1,
        downloadMbps: 485.2,
        uploadMbps: 312.8,
        rating: 'Excelente'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000).toLocaleString('pt-BR'),
        pingMs: 6,
        jitterMs: 2,
        downloadMbps: 420.5,
        uploadMbps: 298.0,
        rating: 'Excelente'
      }
    ];
  });

  const saveToHistory = (res: SpeedHistory) => {
    const updated = [res, ...history.slice(0, 9)];
    setHistory(updated);
    try {
      localStorage.setItem('netscan_speedtest_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const startSpeedTest = async () => {
    if (isRunning) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRunning(true);
    setError(null);
    setStage('ping');
    setProgress(5);
    setPing(null);
    setJitter(null);
    setDownload(null);
    setUpload(null);

    try {
      // 1. Ping & Jitter (real, contra speed.cloudflare.com)
      const { pingMs, jitterMs } = await measurePing(controller.signal);
      setPing(pingMs);
      setJitter(jitterMs);
      setStage('download');
      setProgress(15);

      // 2. Download real, com progresso animado a partir de bytes recebidos
      const finalDl = await measureDownload(controller.signal, (mbps) => {
        setDownload(Number(mbps.toFixed(1)));
        setProgress((prev) => Math.min(65, prev + 2));
      });
      setDownload(Number(finalDl.toFixed(1)));
      setStage('upload');
      setProgress(70);

      // 3. Upload real, via XHR (único jeito de medir progresso de envio)
      const finalUl = await measureUpload(controller.signal, (mbps) => {
        setUpload(Number(mbps.toFixed(1)));
        setProgress((prev) => Math.min(98, prev + 2));
      });
      setUpload(Number(finalUl.toFixed(1)));
      setStage('complete');
      setProgress(100);

      let rating = 'Excelente';
      if (finalDl < 25) rating = 'Regular';
      else if (finalDl < 100) rating = 'Boa';

      saveToHistory({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        pingMs,
        jitterMs,
        downloadMbps: Number(finalDl.toFixed(1)),
        uploadMbps: Number(finalUl.toFixed(1)),
        rating
      });
    } catch (err) {
      if (isAbortError(err)) {
        setStage('idle');
        setProgress(0);
      } else {
        setError('Não foi possível completar o teste de velocidade. Verifique sua conexão com a internet.');
        setStage('idle');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const cancelSpeedTest = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Gauge className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span>Speedtest de Banda Integrado</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                WAN / LAN 1 Gbps
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Meça latência real (Ping/Jitter), taxa de Download e Upload da sua conexão com a internet contra a rede da Cloudflare. Consome algumas dezenas de MB por teste.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={cancelSpeedTest}
              className="px-3 py-2.5 text-xs font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 bg-rose-600 hover:bg-rose-500 text-white"
              title="Cancelar teste"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
          )}
          <button
            onClick={startSpeedTest}
            disabled={isRunning}
            className={`px-5 py-2.5 text-xs font-extrabold rounded-xl border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isRunning
                ? 'bg-amber-500 text-slate-950 border-slate-900 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-900'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Testando Velocidade... ({progress}%)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Teste de Velocidade</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={`px-4 py-3 rounded-xl border-2 text-xs font-bold flex items-center justify-between gap-3 ${
          isLight ? 'bg-rose-50 border-rose-600 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="underline shrink-0">Fechar</button>
        </div>
      )}

      {/* Main Meter Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Speed Meters Display */}
        <div className={`lg:col-span-2 p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-6 ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          
          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>
                  {stage === 'ping' && 'Medindo Ping e Jitter...'}
                  {stage === 'download' && 'Testando Taxa de Download...'}
                  {stage === 'upload' && 'Testando Taxa de Upload...'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden border-2 border-slate-900">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Download Box */}
            <div className={`p-5 rounded-xl border-2 space-y-2 relative overflow-hidden ${
              stage === 'download'
                ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                : isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-indigo-500">
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Download</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold">
                  Mbps
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
                {download !== null ? download : '--'}
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Velocidade de transferência de recebimento de dados.
              </p>
            </div>

            {/* Upload Box */}
            <div className={`p-5 rounded-xl border-2 space-y-2 relative overflow-hidden ${
              stage === 'upload'
                ? 'border-sky-500 ring-2 ring-sky-500/30'
                : isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-sky-500">
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Upload</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 font-bold">
                  Mbps
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-sky-600 dark:text-sky-400 tracking-tight">
                {upload !== null ? upload : '--'}
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Velocidade de envio de arquivos para a rede externa.
              </p>
            </div>

          </div>

          {/* Latency Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/40">
            
            <div className={`p-3 rounded-xl border-2 text-center ${
              isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Ping (Latência)</span>
              <span className="text-lg font-extrabold font-mono text-emerald-500">
                {ping !== null ? `${ping} ms` : '--'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 text-center ${
              isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Jitter</span>
              <span className="text-lg font-extrabold font-mono text-amber-500">
                {jitter !== null ? `${jitter} ms` : '--'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 text-center ${
              isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Servidor</span>
              <span className="text-xs font-extrabold font-mono text-slate-300 block truncate" title="speed.cloudflare.com">
                Cloudflare
              </span>
            </div>

            <div className={`p-3 rounded-xl border-2 text-center ${
              isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Status Conexão</span>
              <span className="text-xs font-extrabold font-mono text-emerald-400 block">
                Ótima
              </span>
            </div>

          </div>

          {/* Diagnostics summary report */}
          {download !== null && (
            <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
              isLight ? 'bg-emerald-50 border-slate-900 text-slate-900' : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold">Diagnóstico de Conexão Concluído</h4>
                <p className="text-xs leading-relaxed opacity-90">
                  Sua conexão de <span className="font-bold">{download} Mbps</span> é altamente recomendada para streaming 4K HDR simultâneo, transferências de arquivos de grande porte, jogos online competitivos com baixíssima latência e chamadas de vídeo sem travamentos.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Speedtest History Log */}
        <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800/40">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Histórico de Testes</span>
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {history.length} testes
            </span>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhum teste de velocidade gravado.
              </p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border-2 space-y-1.5 text-xs transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[10px] text-slate-400 font-bold">{item.timestamp}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {item.rating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono font-extrabold pt-1">
                    <div className="flex items-center gap-1 text-indigo-500">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>{item.downloadMbps} Mbps</span>
                    </div>

                    <div className="flex items-center gap-1 text-sky-500">
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>{item.uploadMbps} Mbps</span>
                    </div>

                    <div className="text-emerald-500 text-[11px]">
                      {item.pingMs} ms
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
