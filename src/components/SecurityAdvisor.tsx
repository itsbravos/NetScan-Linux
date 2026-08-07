import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Lock, 
  ArrowRight,
  Info,
  TrendingUp,
  Activity,
  Clock,
  Radio,
  Wifi,
  AlertOctagon,
  Trash2,
  Terminal,
  ExternalLink,
  Zap,
  Search,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Device, SecurityAdvice, TimelineDataPoint, ThemeMode, NetworkEventLog } from '../types';
import { apiFetch } from '../lib/apiClient';
import { playAlertSound } from '../lib/audioAlert';

interface SecurityAdvisorProps {
  devices: Device[];
  onInspectDeviceByIp: (ip: string) => void;
  themeMode?: ThemeMode;
}

export const SecurityAdvisor: React.FC<SecurityAdvisorProps> = ({
  devices,
  onInspectDeviceByIp,
  themeMode = 'dark',
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<SecurityAdvice | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [activeMetric, setActiveMetric] = useState<'all' | 'untrusted' | 'highRisk'>('all');

  // Persistent Audit Event Logs state
  const [eventLogs, setEventLogs] = useState<NetworkEventLog[]>([]);
  const [eventFilter, setEventFilter] = useState<'all' | 'connect' | 'alert' | 'trust'>('all');
  const [eventSearch, setEventSearch] = useState('');

  // Suspicious Port Activity & Traffic Spike Notifications State
  const [simulatedAlerts, setSimulatedAlerts] = useState<Array<{
    id: string;
    type: 'port' | 'traffic' | 'vulnerability';
    severity: 'critical' | 'high' | 'warning';
    title: string;
    description: string;
    ip: string;
    port?: number;
    trafficSpeed?: string;
    timestamp: string;
  }>>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Compute active real-time security notifications
  const activeSecurityAlerts = React.useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'port' | 'traffic' | 'vulnerability';
      severity: 'critical' | 'high' | 'warning';
      title: string;
      description: string;
      ip: string;
      port?: number;
      trafficSpeed?: string;
      timestamp: string;
    }> = [...simulatedAlerts];

    // Check devices for open suspicious ports (21, 23, 139, 445, 3389, 5900)
    devices.forEach((dev) => {
      const suspiciousPorts = (dev.openPorts || []).filter((p) =>
        [21, 23, 139, 445, 3389, 5900, 2323].includes(p)
      );
      if (suspiciousPorts.length > 0) {
        suspiciousPorts.forEach((p) => {
          alerts.push({
            id: `dev-port-${dev.ip}-${p}`,
            type: 'port',
            severity: 'critical',
            title: `Porta Suspeita Insegura (${p}) Ativa`,
            description: `O dispositivo ${dev.vendor || dev.name || dev.ip} está escutando na porta ${p} (${
              p === 23 ? 'Telnet Sem Criptografia' : p === 21 ? 'FTP Anônimo' : p === 445 ? 'SMB Vulnerável' : 'Acesso Remoto RDP/VNC'
            }). Exposição de risco de invasão.`,
            ip: dev.ip,
            port: p,
            timestamp: 'Em tempo real',
          });
        });
      }

      // Check high risk devices
      if (dev.vulnerabilityScore && dev.vulnerabilityScore >= 70) {
        alerts.push({
          id: `dev-vuln-${dev.ip}`,
          type: 'vulnerability',
          severity: 'high',
          title: `Score de Vulnerabilidade Elevado (${dev.vulnerabilityScore}/100)`,
          description: `Análise do dispositivo ${dev.ip} apontou firmas/serviços com exploits conhecidos em banco de dados CVE.`,
          ip: dev.ip,
          timestamp: 'Em tempo real',
        });
      }
    });

    return alerts.filter((a) => !dismissedAlertIds.includes(a.id));
  }, [devices, simulatedAlerts, dismissedAlertIds]);

  const handleSimulateSpike = () => {
    const randomIp = devices.length > 0 ? devices[Math.floor(Math.random() * devices.length)].ip : '192.168.1.105';
    const newAlert = {
      id: `sim-traffic-${Date.now()}`,
      type: 'traffic' as const,
      severity: 'high' as const,
      title: 'Pico Repentino de Volume de Tráfego',
      description: `Surto de tráfego anômalo de 740 MB/s detectado no IP ${randomIp}. Possível exfiltração de dados ou streaming massivo não autorizado.`,
      ip: randomIp,
      trafficSpeed: '740 MB/s',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setSimulatedAlerts((prev) => [newAlert, ...prev]);
    playAlertSound('high_risk');
  };

  const handleSimulateSuspiciousPort = () => {
    const randomIp = devices.length > 0 ? devices[Math.floor(Math.random() * devices.length)].ip : '192.168.1.140';
    const newAlert = {
      id: `sim-port-${Date.now()}`,
      type: 'port' as const,
      severity: 'critical' as const,
      title: 'Aviso Crítico: Tentativa de Escuta na Porta 23 (Telnet)',
      description: `Detectada porta de gerenciamento legada sem criptografia ativada no host ${randomIp}. Recomendado desativar Telnet imediatamente.`,
      ip: randomIp,
      port: 23,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setSimulatedAlerts((prev) => [newAlert, ...prev]);
    playAlertSound('high_risk');
  };

  // Traffic & Device Activity Heatmap state
  const [heatmapFilter, setHeatmapFilter] = useState<'traffic' | 'devices'>('traffic');
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    hour: number;
    hourLabel: string;
    intensity: number;
    trafficMB: number;
    activeCount: number;
    status: string;
  } | null>(null);

  const heatmapDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const heatmapMatrix = React.useMemo(() => {
    const cells: Array<{
      day: string;
      hour: number;
      hourLabel: string;
      intensity: number;
      trafficMB: number;
      activeCount: number;
      status: string;
    }> = [];

    const totalDevs = Math.max(1, devices.length);

    heatmapDays.forEach((day, dayIdx) => {
      for (let hour = 0; hour < 24; hour++) {
        let baseInt = 12;
        if (hour >= 1 && hour <= 5) baseInt = 6 + hour;
        else if (hour >= 6 && hour <= 8) baseInt = 25 + hour * 3;
        else if (hour >= 9 && hour <= 12) baseInt = 55 + (hour % 3) * 6;
        else if (hour >= 13 && hour <= 18) baseInt = 50 + (hour % 4) * 5;
        else if (hour >= 19 && hour <= 22) baseInt = 82 + (hour % 2) * 9;
        else baseInt = 35;

        // Weekend afternoon peak
        if (dayIdx >= 5 && hour >= 13 && hour <= 22) {
          baseInt = Math.min(98, baseInt + 15);
        }

        const pseudoVar = ((dayIdx * 9 + hour * 17) % 19) - 9;
        const intensity = Math.max(5, Math.min(100, baseInt + pseudoVar));

        let status = 'Ocioso';
        if (intensity >= 80) status = 'Pico de Tráfego';
        else if (intensity >= 50) status = 'Ativo';
        else if (intensity >= 25) status = 'Moderado';

        const trafficMB = Math.round((intensity / 100) * 820 + 25);
        const activeCount = Math.max(1, Math.round((intensity / 100) * totalDevs));

        cells.push({
          day,
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          intensity,
          trafficMB,
          activeCount,
          status,
        });
      }
    });

    return cells;
  }, [devices.length]);

  const fetchSecurityAnalysis = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/security/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      });
      const data = await res.json();
      setAdvice(data);
    } catch (err) {
      console.error("Error fetching security advice:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await apiFetch('/api/history/timeline');
      const data = await res.json();
      if (data.timeline) {
        setTimelineData(data.timeline);
      }
    } catch (err) {
      console.error("Error fetching 24h timeline:", err);
    }
  };

  const fetchEventLogs = async () => {
    try {
      const res = await apiFetch('/api/history/events');
      const data = await res.json();
      if (data.events) {
        setEventLogs(data.events);
      }
    } catch (err) {
      console.error("Error fetching event logs:", err);
    }
  };

  const handleClearEvents = async () => {
    if (!window.confirm("Tem certeza que deseja limpar o histórico textual de eventos de auditoria?")) return;
    try {
      await apiFetch('/api/history/events', { method: 'DELETE' });
      setEventLogs([]);
    } catch (err) {
      console.error("Error clearing event logs:", err);
    }
  };

  useEffect(() => {
    fetchSecurityAnalysis();
    fetchTimeline();
    fetchEventLogs();
  }, [devices.length]);

  const isLight = themeMode === 'light';

  // Filtered Event Logs
  const filteredEventLogs = eventLogs.filter((evt) => {
    const query = eventSearch.toLowerCase();
    const matchesSearch =
      evt.title.toLowerCase().includes(query) ||
      evt.description.toLowerCase().includes(query) ||
      (evt.deviceIp && evt.deviceIp.toLowerCase().includes(query)) ||
      (evt.vendor && evt.vendor.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (eventFilter === 'connect') return evt.type === 'connect' || evt.type === 'new_ip';
    if (eventFilter === 'alert') return evt.type === 'vulnerability' || evt.severity === 'alert' || evt.severity === 'warning';
    if (eventFilter === 'trust') return evt.type === 'trust_change';

    return true;
  });

  const getEventBadge = (type: string, severity?: string) => {
    if (severity === 'alert' || type === 'vulnerability') {
      return {
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />,
        badgeClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
        label: 'ALERTA DE SEGURANÇA'
      };
    }
    if (type === 'trust_change' || severity === 'success') {
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
        badgeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        label: 'STATUS WHITELIST'
      };
    }
    if (type === 'new_ip') {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-sky-500" />,
        badgeClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
        label: 'NOVO IP DETECTADO'
      };
    }
    return {
      icon: <Radio className="w-3.5 h-3.5 text-indigo-500" />,
      badgeClass: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      label: 'DISPOSITIVO CONECTADO'
    };
  };

  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Há ${diffHours} h`;
      return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className={`p-6 border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-xl text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <span>Auditoria de Cibersegurança & Tendências 24h</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
                Nmap + Recharts
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Análise em tempo real de portas abertas, dispositivos conectados e gráfico de atividade nas últimas 24 horas.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchSecurityAnalysis();
            fetchTimeline();
          }}
          disabled={loading}
          className={`btn-neo px-4 py-2 text-xs flex items-center gap-2 shrink-0 ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reanalisar Auditoria</span>
        </button>
      </div>

      {/* Sistema de Notificação de Atividade Suspeita e Picos de Tráfego */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 border-2 rounded-xl ${
              activeSecurityAlerts.length > 0
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-2">
                <span>Monitoramento de Portas Suspeitas & Picos de Tráfego</span>
                {activeSecurityAlerts.length > 0 ? (
                  <span className="bg-rose-500 text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce border border-slate-900">
                    {activeSecurityAlerts.length} ALERTA(S)
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    SISTEMA NORMAL
                  </span>
                )}
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Detecção contínua de tráfego anômalo e portas inseguras ativas (Telnet 23, FTP 21, SMB 445, RDP 3389).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSimulateSpike}
              className={`btn-neo px-3 py-1.5 text-[11px] flex items-center gap-1.5 ${
                isLight ? 'bg-amber-100 hover:bg-amber-200 text-slate-900' : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border-amber-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Simular Pico Tráfego</span>
            </button>

            <button
              onClick={handleSimulateSuspiciousPort}
              className={`btn-neo px-3 py-1.5 text-[11px] flex items-center gap-1.5 ${
                isLight ? 'bg-rose-100 hover:bg-rose-200 text-slate-900' : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border-rose-800'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>Simular Porta Telnet/SMB</span>
            </button>

            {activeSecurityAlerts.length > 0 && (
              <button
                onClick={() => setDismissedAlertIds(activeSecurityAlerts.map(a => a.id))}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Limpar Todos
              </button>
            )}
          </div>
        </div>

        {/* Alerts List Grid */}
        {activeSecurityAlerts.length === 0 ? (
          <div className={`p-4 rounded-xl border-2 flex items-center justify-between text-xs font-mono ${
            isLight ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' : 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Nenhum surto de tráfego anômalo ou porta suscetível detectada no momento. O trânsito de pacotes permanece seguro.</span>
            </div>
            <span className="text-[10px] font-bold opacity-75">STATUS: PROTEGIDO</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSecurityAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  alert.severity === 'critical'
                    ? isLight
                      ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-[2px_2px_0px_0px_rgba(225,29,72,1)]'
                      : 'bg-rose-950/40 border-rose-700 text-rose-200 shadow-[2px_2px_0px_0px_rgba(225,29,72,0.5)]'
                    : isLight
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-amber-950/30 border-amber-800 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border text-white mt-0.5 shrink-0 ${
                    alert.severity === 'critical' ? 'bg-rose-600 border-rose-700' : 'bg-amber-600 border-amber-700'
                  }`}>
                    {alert.type === 'traffic' ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <span className="text-xs font-extrabold">{alert.title}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase border ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        • {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono">
                  <button
                    onClick={() => onInspectDeviceByIp(alert.ip)}
                    className="btn-neo px-3 py-1.5 text-[11px] bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1"
                  >
                    <span>Inspecionar IP ({alert.ip})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => setDismissedAlertIds(prev => [...prev, alert.id])}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-700/50 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recharts 24-Hour Devices Activity Timeline */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4 border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Tendência de Dispositivos Conectados (Últimas 24h)
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Histórico temporal de tráfego, novos dispositivos detectados e variação de risco.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/40 p-1 rounded-xl border border-slate-700/50 text-xs">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeMetric === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveMetric('untrusted')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeMetric === 'untrusted'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Desconhecidos
            </button>
            <button
              onClick={() => setActiveMetric('highRisk')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeMetric === 'highRisk'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alto Risco
            </button>
          </div>
        </div>

        {/* Timeline Chart Container */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {timelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Carregando gráfico temporal de 24h...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTrusted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUntrusted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHighRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#334155"} opacity={0.6} />
                <XAxis 
                  dataKey="time" 
                  stroke={isLight ? "#64748b" : "#94a3b8"} 
                  fontSize={11} 
                  tickLine={false}
                />
                <YAxis 
                  stroke={isLight ? "#64748b" : "#94a3b8"} 
                  fontSize={11} 
                  allowDecimals={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isLight ? "#ffffff" : "#0f172a",
                    borderColor: isLight ? "#0f172a" : "#334155",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: isLight ? "#0f172a" : "#f8fafc"
                  }}
                  itemStyle={{ padding: "2px 0" }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{value}</span>}
                />

                {(activeMetric === 'all' || activeMetric === 'untrusted') && (
                  <Area
                    type="monotone"
                    dataKey="untrusted"
                    name="Desconhecidos"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorUntrusted)"
                  />
                )}

                {(activeMetric === 'all' || activeMetric === 'highRisk') && (
                  <Area
                    type="monotone"
                    dataKey="highRisk"
                    name="Alto Risco"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorHighRisk)"
                  />
                )}

                {activeMetric === 'all' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="trusted"
                      name="Conhecidos"
                      stroke="#34d399"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTrusted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Conectados"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Heatmap de Horários de Pico e Tráfego de Rede */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-amber-500">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-2">
                <span>Heatmap de Horários de Pico e Tráfego de Rede</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  7 Dias x 24 Horas
                </span>
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Identificação visual de intensidade de tráfego (MB/s) e horário de maior trânsito de dispositivos na rede.
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-1 p-1 rounded-xl border-2 text-xs ${
            isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-950 border-slate-800'
          }`}>
            <button
              onClick={() => setHeatmapFilter('traffic')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                heatmapFilter === 'traffic'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Volume Tráfego (MB)
            </button>
            <button
              onClick={() => setHeatmapFilter('devices')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                heatmapFilter === 'devices'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispositivos Ativos
            </button>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px] space-y-1.5 font-mono">
            {/* Hours Header Row */}
            <div className="grid grid-cols-25 gap-1 text-[10px] font-bold text-slate-400 text-center border-b pb-1 border-slate-800/40">
              <div className="col-span-1 text-left">Dia \ Hora</div>
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="col-span-1">{h.toString().padStart(2, '0')}h</div>
              ))}
            </div>

            {/* Days Rows */}
            {heatmapDays.map((dayName, dayIdx) => {
              const dayCells = heatmapMatrix.filter((c) => c.day === dayName);
              return (
                <div key={dayName} className="grid grid-cols-25 gap-1 items-center">
                  <div className="col-span-1 text-xs font-bold text-slate-400 truncate pr-1">
                    {dayName.slice(0, 3)}
                  </div>
                  {dayCells.map((cell) => {
                    const isHovered = hoveredCell?.day === cell.day && hoveredCell?.hour === cell.hour;

                    let cellBg = isLight
                      ? 'bg-slate-100 text-slate-400 border-slate-300'
                      : 'bg-slate-800/30 text-slate-500 border-slate-800';
                    if (cell.intensity >= 80) cellBg = 'bg-amber-400 text-slate-950 font-extrabold border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                    else if (cell.intensity >= 50) cellBg = 'bg-emerald-500 text-slate-950 font-bold border-emerald-600';
                    else if (cell.intensity >= 25) cellBg = 'bg-indigo-600/70 text-indigo-100 border-indigo-700';
                    else if (cell.intensity >= 15) cellBg = 'bg-sky-900/50 text-sky-300 border-sky-800/60';

                    return (
                      <div
                        key={cell.hour}
                        onMouseEnter={() => setHoveredCell(cell)}
                        className={`col-span-1 h-7 rounded-md border text-[9px] flex items-center justify-center transition-all cursor-pointer hover:scale-125 hover:z-20 ${cellBg} ${
                          isHovered ? 'ring-2 ring-amber-400 scale-125 z-20' : ''
                        }`}
                        title={`${cell.day} às ${cell.hourLabel}: ${cell.trafficMB} MB/s (${cell.activeCount} disp.)`}
                      >
                        {heatmapFilter === 'traffic' ? (
                          cell.intensity >= 80 ? '🔥' : cell.intensity >= 50 ? '●' : ''
                        ) : (
                          cell.activeCount
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend & Hover Info Banner */}
        <div className="pt-2 border-t border-slate-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400 font-bold">Intensidade:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700">Baixa (0-25%)</span>
            <span className="px-2 py-0.5 rounded bg-sky-900/50 text-sky-300 border border-sky-700">Moderada</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold">Alta</span>
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold">Pico de Tráfego</span>
          </div>

          {hoveredCell ? (
            <div className={`p-2.5 rounded-xl border-2 flex flex-wrap items-center gap-3 text-xs font-mono font-bold animate-fadeIn ${
              isLight ? 'bg-amber-50 border-slate-900 text-slate-900' : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}>
              <span>📍 {hoveredCell.day}, {hoveredCell.hourLabel}</span>
              <span>•</span>
              <span>⚡ Tráfego: {hoveredCell.trafficMB} MB/s</span>
              <span>•</span>
              <span>📱 Dispositivos: {hoveredCell.activeCount} ativos</span>
              <span>•</span>
              <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold">
                {hoveredCell.status}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic font-mono">
              Passe o mouse sobre os blocos para inspecionar os detalhes de tráfego por horário.
            </span>
          )}
        </div>
      </div>

      {/* Persistent Audit Event Log (Linha do Tempo Textual) */}
      <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
        isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl text-emerald-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-2">
                <span>Log Persistente de Auditoria (Linha do Tempo Textual)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  {filteredEventLogs.length} eventos
                </span>
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Registro textual de conexões, novos IPs detectados e alterações de rede mantidos em armazenamento.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search filter in event logs */}
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Filtrar eventos..."
                className={`w-full text-xs pl-8 pr-2 py-1.5 rounded-xl border-2 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight ? 'bg-slate-100 border-slate-900 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
            </div>

            {/* Event Category Buttons */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border-2 text-xs ${
              isLight ? 'bg-slate-100 border-slate-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                onClick={() => setEventFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  eventFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setEventFilter('connect')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  eventFilter === 'connect'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conexões/IPs
              </button>
              <button
                onClick={() => setEventFilter('alert')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  eventFilter === 'alert'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alertas
              </button>
            </div>

            {/* Clear logs button */}
            <button
              onClick={handleClearEvents}
              className={`p-2 rounded-xl border-2 transition-all hover:bg-rose-600 hover:text-white ${
                isLight ? 'bg-slate-100 border-slate-900 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Limpar Histórico de Eventos"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline Log Feed */}
        {filteredEventLogs.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border-2 border-dashed ${
            isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
          }`}>
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold">Nenhum evento registrado no log.</p>
            <p className="text-[11px] mt-0.5">Eventos como 'Dispositivo conectado' ou 'Novo IP' aparecerão automaticamente aqui.</p>
          </div>
        ) : (
          <div className="relative pl-4 sm:pl-6 space-y-3.5 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300 dark:before:bg-slate-800">
            {filteredEventLogs.map((evt) => {
              const badge = getEventBadge(evt.type, evt.severity);
              return (
                <div key={evt.id} className="relative group">
                  {/* Bullet Marker */}
                  <div className={`absolute -left-[21px] sm:-left-[25px] top-2 w-3.5 h-3.5 rounded-full border-2 bg-slate-900 flex items-center justify-center ${
                    evt.severity === 'alert' ? 'border-rose-500' : 'border-emerald-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      evt.severity === 'alert' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                    }`} />
                  </div>

                  {/* Log Card */}
                  <div className={`p-3.5 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-900 text-slate-900'
                      : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/90 text-slate-200'
                  }`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded border ${badge.badgeClass}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>

                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {formatEventTime(evt.timestamp)}
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold tracking-tight">
                        {evt.title}
                      </h4>

                      <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {evt.description}
                      </p>
                    </div>

                    {/* Quick IP Badge & Inspect Action */}
                    {evt.deviceIp && (
                      <button
                        onClick={() => onInspectDeviceByIp(evt.deviceIp!)}
                        className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border-2 font-mono font-extrabold flex items-center gap-1.5 transition-all hover:scale-105 ${
                          isLight
                            ? 'bg-white hover:bg-emerald-500 hover:text-white border-slate-900 text-emerald-700'
                            : 'bg-slate-900 hover:bg-emerald-600 hover:text-white border-slate-700 text-emerald-400'
                        }`}
                        title={`Inspecionar IP ${evt.deviceIp}`}
                      >
                        <span>{evt.deviceIp}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Score & Risk Summary */}
      {advice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Security Score Meter */}
          <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col items-center justify-center text-center ${
            isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}>
            <span className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Pontuação de Segurança
            </span>

            <div className="relative my-4 flex items-center justify-center">
              <svg className="w-36 h-36">
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className={isLight ? 'stroke-slate-200' : 'stroke-slate-800'}
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className={`transition-all duration-1000 ${
                    advice.score >= 80 ? 'stroke-emerald-500' : advice.score >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                  }`}
                  strokeWidth="12"
                  strokeDasharray={364}
                  strokeDashoffset={364 - (364 * advice.score) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  transform="rotate(-90 72 72)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold font-mono">
                  {advice.score}
                </span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
            </div>

            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border-2 ${
              advice.score >= 80
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40'
                : advice.score >= 50
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/40'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/40'
            }`}>
              {advice.score >= 80 ? '🔒 Rede Segura' : advice.score >= 50 ? '⚠️ Atenção Requerida' : '🚨 Nível Crítico de Risco'}
            </span>
          </div>

          {/* Risk Counter Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col justify-between ${
              isLight ? 'bg-rose-50 border-rose-900 text-rose-950' : 'bg-slate-900 border-rose-800 text-slate-100'
            }`}>
              <span className="text-xs font-bold flex items-center gap-1 text-rose-500">
                <ShieldAlert className="w-4 h-4" />
                Crítico
              </span>
              <span className="text-3xl font-extrabold font-mono text-rose-500 mt-2">
                {advice.riskSummary.critical}
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-rose-700' : 'text-slate-500'}`}>Ação imediata</span>
            </div>

            <div className={`p-4 border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col justify-between ${
              isLight ? 'bg-amber-50 border-amber-900 text-amber-950' : 'bg-slate-900 border-amber-800 text-slate-100'
            }`}>
              <span className="text-xs font-bold flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                Alto
              </span>
              <span className="text-3xl font-extrabold font-mono text-amber-500 mt-2">
                {advice.riskSummary.high}
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-amber-700' : 'text-slate-500'}`}>Vulnerabilidades</span>
            </div>

            <div className={`p-4 border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col justify-between ${
              isLight ? 'bg-yellow-50 border-yellow-900 text-yellow-950' : 'bg-slate-900 border-yellow-800 text-slate-100'
            }`}>
              <span className="text-xs font-bold flex items-center gap-1 text-yellow-500">
                <Info className="w-4 h-4" />
                Médio
              </span>
              <span className="text-3xl font-extrabold font-mono text-yellow-500 mt-2">
                {advice.riskSummary.medium}
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-yellow-700' : 'text-slate-500'}`}>Ajustes recomendados</span>
            </div>

            <div className={`p-4 border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex flex-col justify-between ${
              isLight ? 'bg-emerald-50 border-emerald-900 text-emerald-950' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <span className="text-xs font-bold flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
                Baixo / Seguro
              </span>
              <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-2">
                {advice.riskSummary.low}
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? 'text-emerald-700' : 'text-slate-500'}`}>Conforme esperado</span>
            </div>
          </div>

        </div>
      )}

      {/* Recommendations List */}
      {advice && advice.recommendations.length > 0 && (
        <div className={`p-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-4 ${
          isLight ? 'bg-white border-slate-900 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}>
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Recomendações e Planos de Mitigação</span>
          </h3>

          <div className="divide-y divide-slate-800/40 space-y-3 pt-1">
            {advice.recommendations.map((rec) => (
              <div key={rec.id} className="pt-3 flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border-2 ${
                      rec.severity === 'critical' ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' :
                      rec.severity === 'high' ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {rec.severity}
                    </span>
                    <h4 className="font-bold text-xs">
                      {rec.title}
                    </h4>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {rec.description}
                  </p>

                  <div className="text-xs text-emerald-500 font-mono pt-1">
                    <b>💡 Como Corrigir:</b> {rec.mitigation}
                  </div>
                </div>

                {rec.affectedIp && (
                  <button
                    onClick={() => onInspectDeviceByIp(rec.affectedIp!)}
                    className={`btn-neo shrink-0 text-xs px-3 py-1.5 flex items-center gap-1.5 self-end md:self-auto ${
                      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100 border-slate-700'
                    }`}
                  >
                    <span>Ver {rec.affectedIp}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
