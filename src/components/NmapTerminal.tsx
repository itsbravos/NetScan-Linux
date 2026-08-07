import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  Code,
  Sparkles,
  Command,
  AlertTriangle
} from 'lucide-react';
import { ThemeMode } from '../types';
import { apiFetch } from '../lib/apiClient';

interface NmapTerminalProps {
  targetIp?: string;
  themeMode?: ThemeMode;
}

export const NmapTerminal: React.FC<NmapTerminalProps> = ({
  targetIp = '192.168.1.0/24',
  themeMode = 'dark',
}) => {
  const [commandInput, setCommandInput] = useState(`nmap -sV -O ${targetIp}`);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>(
    `# Nmap CLI Terminal - Linux Scanner Suite\n# Digite um comando Nmap abaixo ou selecione um dos atalhos pré-configurados:\n# Ex: nmap -sV -O -F 192.168.1.0/24\n`
  );
  const [nmapStatus, setNmapStatus] = useState<{ available: boolean; version?: string } | null>(null);

  useEffect(() => {
    apiFetch('/api/nmap/status')
      .then((res) => res.json())
      .then((data) => setNmapStatus(data))
      .catch(() => setNmapStatus({ available: false }));
  }, []);

  const isLight = themeMode === 'light';

  const presets = [
    { label: "Varredura de Rede (Subnet)", cmd: `nmap -sP ${targetIp}` },
    { label: "Serviços & Versões (-sV)", cmd: `nmap -sV ${targetIp}` },
    { label: "Detecção de Sistema (-O)", cmd: `nmap -O -sV ${targetIp}` },
    { label: "Varredura Rápida Top Ports (-F)", cmd: `nmap -F ${targetIp}` },
    { label: "Script de Vulnerabilidades (--script vuln)", cmd: `nmap --script vuln ${targetIp}` },
  ];

  const handleExecute = async (cmdToRun?: string) => {
    const finalCmd = cmdToRun || commandInput;
    setIsExecuting(true);

    // Append command to terminal output
    setTerminalOutput((prev) => prev + `\n$ ${finalCmd}\nExecutando varredura Nmap...\n`);

    try {
      const res = await apiFetch('/api/nmap/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: finalCmd, targetIp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTerminalOutput((prev) => prev + `[ERRO ${res.status}]: ${data.error || 'Comando rejeitado.'}\n`);
      } else {
        setTerminalOutput((prev) => prev + data.rawStdout + '\n');
      }
    } catch (err) {
      setTerminalOutput((prev) => prev + `[ERRO]: Falha ao executar Nmap: ${err}\n`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(terminalOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Command Presets */}
      <div className={`border-2 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${
        isLight
          ? 'bg-white border-slate-900 text-slate-900'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2.5 rounded-xl border-2 ${
            isLight
              ? 'bg-emerald-100 border-slate-900 text-emerald-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              Terminal Nmap Interactive (Linux CLI)
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
              Execute parâmetros nativos do Nmap (Network Mapper) para análise avançada de hosts e portas.
            </p>
          </div>
        </div>

        {/* Command Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`text-xs font-mono flex items-center gap-1 mr-1 ${isLight ? 'text-slate-700 font-bold' : 'text-slate-500'}`}>
            <Command className="w-3.5 h-3.5" /> Atalhos:
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCommandInput(p.cmd);
                handleExecute(p.cmd);
              }}
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-mono font-extrabold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 ${
                isLight
                  ? 'bg-slate-100 border-slate-900 text-slate-900 hover:bg-emerald-600 hover:text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nmap availability / privilege banner */}
      {nmapStatus && !nmapStatus.available && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border-2 text-xs font-bold ${
          isLight ? 'bg-rose-50 border-rose-600 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            O binário <code>nmap</code> não foi encontrado neste sistema. Instale com <code>sudo apt install nmap</code> (ou equivalente da sua distro) para executar varreduras reais.
          </span>
        </div>
      )}
      {nmapStatus?.available && (
        <div className={`flex items-start gap-2 px-4 py-2.5 rounded-xl border-2 text-[11px] font-semibold ${
          isLight ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-amber-950/30 border-amber-800 text-amber-200'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Nmap {nmapStatus.version} disponível. Este servidor roda sem privilégios de root: a detecção de sistema operacional (<code>-O</code>) e alguns scans avançados retornam resultados parciais ou degradados.
          </span>
        </div>
      )}

      {/* Terminal View Component */}
      <div className={`border-2 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-xs transition-colors ${
        isLight
          ? 'bg-white border-slate-900 text-slate-900'
          : 'bg-slate-950 border-slate-800 text-slate-100'
      }`}>
        
        {/* Terminal Header Bar */}
        <div className={`px-4 py-2.5 border-b-2 border-slate-900 flex items-center justify-between ${
          isLight ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 border border-slate-900" />
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-slate-900" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-900" />
            <span className={`ml-2 font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-400'}`}>
              bash — nmap@linux-server:~#
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-lg border-2 text-[11px] font-sans font-bold transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 ${
                isLight
                  ? 'bg-white border-slate-900 text-slate-900 hover:bg-slate-100'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
              }`}
              title="Copiar texto do terminal"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={() => setTerminalOutput(`$ root@linux-server:~# \n`)}
              className={`p-1.5 rounded-lg border-2 text-[11px] font-sans font-bold transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 ${
                isLight
                  ? 'bg-white border-slate-900 text-rose-700 hover:bg-rose-50'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-rose-400'
              }`}
              title="Limpar tela do terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Command Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          className={`p-3 border-b-2 border-slate-900 flex items-center space-x-2 ${
            isLight ? 'bg-slate-100' : 'bg-slate-900/60 border-slate-800/80'
          }`}
        >
          <span className={`font-bold select-none ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>$</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Digite o comando nmap..."
            className={`flex-1 bg-transparent font-mono text-xs focus:outline-none ${
              isLight ? 'text-slate-900 placeholder:text-slate-400 font-extrabold' : 'text-slate-100 placeholder:text-slate-600'
            }`}
          />
          <button
            type="submit"
            disabled={isExecuting || !commandInput.trim()}
            className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-extrabold font-sans flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isExecuting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar</span>
          </button>
        </form>

        {/* Stdout Output Area */}
        <div className={`p-4 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed ${
          isLight
            ? 'bg-slate-50 text-slate-900 font-bold selection:bg-emerald-200 selection:text-slate-900'
            : 'bg-slate-950 text-emerald-300 selection:bg-emerald-900'
        }`}>
          {terminalOutput}
        </div>

      </div>

      {/* Flag Guide */}
      <div className={`p-4 border-2 border-slate-900 rounded-2xl text-xs space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
        isLight ? 'bg-white text-slate-800' : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
      }`}>
        <h4 className={`font-extrabold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span>Guia Rápido de Parâmetros do Nmap:</span>
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>-sV:</b> Detecta versões dos serviços nas portas abertas</li>
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>-O:</b> Tenta identificar o Sistema Operacional (OS Detection)</li>
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>-F:</b> Varredura rápida (Top 100 portas mais comuns)</li>
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>-sP / -sn:</b> Apenas ping scan (Mapeia hosts online)</li>
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>--script vuln:</b> Executa scripts da NSE para buscar falhas</li>
          <li><b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>-p-:</b> Varrer todas as 65.535 portas TCP</li>
        </ul>
      </div>

    </div>
  );
};

