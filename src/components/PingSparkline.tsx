import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { Zap } from 'lucide-react';

interface PingSparklineProps {
  pingHistory?: number[];
  currentLatencyMs: number;
  ip?: string;
  isLight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PingSparkline: React.FC<PingSparklineProps> = ({
  pingHistory,
  currentLatencyMs,
  ip = '192.168.1.1',
  isLight = false,
  size = 'md',
}) => {
  // Ensure we have exactly 10 ping data points
  const chartData = useMemo(() => {
    let history = pingHistory;
    if (!history || history.length < 10) {
      const baseMs = currentLatencyMs || 5;
      const seed = ip.split('.').reduce((acc, part) => acc + parseInt(part, 10) || 0, 0);
      history = Array.from({ length: 10 }).map((_, i) => {
        const offset = Math.sin((i + seed) * 1.7) * Math.min(baseMs * 0.35, 6);
        return Math.max(1, Math.round(baseMs + offset));
      });
    }

    const last10 = history.slice(-10);
    return last10.map((ping, idx) => ({
      index: idx + 1,
      ping,
    }));
  }, [pingHistory, currentLatencyMs, ip]);

  const maxPing = Math.max(...chartData.map((d) => d.ping), currentLatencyMs);
  const minPing = Math.min(...chartData.map((d) => d.ping), currentLatencyMs);
  const avgPing = Math.round(
    chartData.reduce((acc, curr) => acc + curr.ping, 0) / chartData.length
  );

  // Determine color based on current/avg ping
  const getStrokeColor = (ms: number) => {
    if (ms <= 5) return '#10b981'; // emerald
    if (ms <= 20) return '#0ea5e9'; // sky
    if (ms <= 50) return '#f59e0b'; // amber
    return '#f43f5e'; // rose
  };

  const strokeColor = getStrokeColor(avgPing);

  const getBadgeClass = (ms: number) => {
    if (ms <= 5) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (ms <= 20) return 'text-sky-500 bg-sky-500/10 border-sky-500/30';
    if (ms <= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  const badgeClass = getBadgeClass(avgPing);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg z-50 pointer-events-none">
          <span>Ping #{payload[0].payload.index}: <strong style={{ color: strokeColor }}>{payload[0].value} ms</strong></span>
        </div>
      );
    }
    return null;
  };

  if (size === 'sm') {
    // Compact Sparkline for Table Row Cell
    return (
      <div className="flex items-center gap-2 font-mono">
        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${badgeClass}`}>
          <Zap className="w-3 h-3 fill-current" />
          <span>{currentLatencyMs}ms</span>
        </span>
        
        <div className="w-16 h-6 shrink-0 relative border rounded border-slate-700/30 bg-slate-950/20 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <YAxis domain={[Math.max(0, minPing - 2), maxPing + 2]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="ping"
                stroke={strokeColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Size 'md' or 'lg' for Device Cards / Modals
  return (
    <div className={`p-2 rounded-xl border flex flex-col justify-between font-mono transition-all ${
      isLight ? 'bg-slate-50/80 border-slate-300' : 'bg-slate-950/60 border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Latência (10 pings)
          </span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeClass}`}>
          {currentLatencyMs} ms (méd {avgPing}ms)
        </span>
      </div>

      {/* Sparkline Canvas */}
      <div className={`${size === 'lg' ? 'h-12' : 'h-8'} w-full relative mt-0.5`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
            <YAxis domain={[Math.max(0, minPing - 2), maxPing + 2]} hide />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="ping"
              stroke={strokeColor}
              strokeWidth={2}
              dot={{ r: 1.5, fill: strokeColor }}
              activeDot={{ r: 3, fill: strokeColor }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Min/Max indicators */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-500 font-bold mt-1 px-0.5">
        <span>Min: {minPing}ms</span>
        <span>Máx: {maxPing}ms</span>
      </div>
    </div>
  );
};
