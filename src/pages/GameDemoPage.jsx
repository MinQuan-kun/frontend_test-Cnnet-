import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, Radio, Clock3, Gauge, Gamepad2 } from 'lucide-react';

const MAX_LOGS = 100;

const GameDemoPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState(0);
  const [lastError, setLastError] = useState('');

  const gameUrl =
    import.meta.env.VITE_BALL_GAME_URL ||
    'http://localhost:3000/Ball_Square_TT/';

  useEffect(() => {
    const handleTelemetry = (event) => {
      const data = event?.data;
      if (!data || data.source !== 'ball_square_tt') return;

      if (data.type === 'telemetry-log') {
        setLogs((prev) => {
          const next = [
            {
              id: `${Date.now()}_${Math.random()}`,
              ts: new Date().toLocaleTimeString('vi-VN'),
              eventType: data.eventType,
              rttMs: Number(data.rttMs || 0),
              note: data.payload?.note || '',
              redPct: Number(data.payload?.redPct || 0),
              bluePct: Number(data.payload?.bluePct || 0),
              bounceCount: Number(data.payload?.bounceCount || 0),
            },
            ...prev,
          ];
          return next.slice(0, MAX_LOGS);
        });
      }

      if (data.type === 'telemetry-summary') {
        setSummary(data.summary || null);
      }

      if (data.type === 'telemetry-error') {
        setErrors((v) => v + 1);
        setLastError(data.message || 'Telemetry error');
      }
    };

    window.addEventListener('message', handleTelemetry);
    return () => window.removeEventListener('message', handleTelemetry);
  }, []);

  useEffect(() => {
    const askSummary = () => {
      const frame = document.querySelector('iframe[title="Ball Square TT"]');
      if (!frame?.contentWindow) return;
      frame.contentWindow.postMessage({ source: 'frontend_game_demo', type: 'request-telemetry-summary' }, '*');
    };

    const id = setInterval(askSummary, 5000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        avgRtt: 0,
        minRtt: 0,
        maxRtt: 0,
      };
    }

    const values = logs.map((l) => l.rttMs);
    const total = values.reduce((sum, v) => sum + v, 0);
    return {
      avgRtt: total / values.length,
      minRtt: Math.min(...values),
      maxRtt: Math.max(...values),
    };
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <nav className="bg-[#0d1225]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-xl transition-all" title="Quay lại">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-cyan-400" />
              <h1 className="text-lg font-bold">
                Ball Square TT <span className="text-cyan-300">gRPC Demo</span>
              </h1>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            GraphQL: match save | gRPC: realtime telemetry
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-[#111827]/80 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Game Frame</p>
            <a href={gameUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">
              Open standalone
            </a>
          </div>
          <iframe
            title="Ball Square TT"
            src={gameUrl}
            className="w-full h-[78vh] bg-black"
            allow="fullscreen"
          />
        </section>

        <aside className="xl:col-span-4 space-y-4">
          <div className="bg-[#111827]/80 rounded-2xl border border-white/10 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" /> Runtime gRPC Metrics
            </h2>
            <MetricRow label="Events" value={logs.length} />
            <MetricRow label="Errors" value={errors} />
            <MetricRow label="Avg RTT" value={`${stats.avgRtt.toFixed(2)} ms`} />
            <MetricRow label="Min RTT" value={`${stats.minRtt.toFixed(2)} ms`} />
            <MetricRow label="Max RTT" value={`${stats.maxRtt.toFixed(2)} ms`} />
            {lastError && (
              <p className="text-[11px] text-rose-400 break-all">Last error: {lastError}</p>
            )}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-white/10 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" /> Session Summary (from gRPC)
            </h2>
            {summary ? (
              <div className="space-y-2 text-xs text-slate-300">
                <MetricRow label="Session" value={summary.sessionId || '-'} />
                <MetricRow label="Total events" value={summary.totalEvents} />
                <MetricRow label="Bounce" value={summary.bounceEvents} />
                <MetricRow label="Skill" value={summary.skillEvents} />
                <MetricRow label="Match end" value={summary.endEvents} />
                <MetricRow label="Events/s" value={Number(summary.eventsPerSecond || 0).toFixed(2)} />
              </div>
            ) : (
              <p className="text-xs text-slate-500">Chưa có summary. Chơi một trận và chờ game gửi MATCH_END.</p>
            )}
          </div>

          <div className="bg-[#111827]/80 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-cyan-400" /> Realtime Event Logs
            </h2>
            <div className="max-h-[35vh] overflow-auto space-y-2 pr-1">
              {logs.length === 0 && <p className="text-xs text-slate-500">Chưa có log gRPC.</p>}
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-bold text-cyan-300">{log.eventType}</span>
                    <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" />{log.ts}</span>
                  </div>
                  <p className="text-slate-400 mt-1">RTT {log.rttMs.toFixed(2)} ms | bounce {log.bounceCount}</p>
                  <p className="text-slate-500">Red {log.redPct.toFixed(1)}% - Blue {log.bluePct.toFixed(1)}%</p>
                  {log.note && <p className="text-slate-500">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

const MetricRow = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-200 font-semibold">{value}</span>
  </div>
);

export default GameDemoPage;
