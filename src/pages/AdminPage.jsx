import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  Shield, ArrowLeft, Activity, BarChart3, Clock, Zap, Hash,
  Trash2, Flame, TrendingUp, AlertCircle, Check, ChevronRight,
  RefreshCw, Download, Timer
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const AdminPage = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [notification, setNotification] = useState(null);

  const loadBenchmarks = () => {
    const saved = JSON.parse(localStorage.getItem('gameBenchmarks') || '[]');
    setBenchmarks(saved);
  };

  useEffect(() => {
    loadBenchmarks();
    const handleStorage = () => loadBenchmarks();
    window.addEventListener('storage', handleStorage);
    // Poll mỗi 2 giây để cập nhật nếu BenchmarkPage đang chạy
    const interval = setInterval(loadBenchmarks, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const clearBenchmarks = () => {
    if (window.confirm('Xóa tất cả lịch sử benchmark?')) {
      localStorage.removeItem('gameBenchmarks');
      setBenchmarks([]);
      showNotification('Đã xóa lịch sử benchmark');
    }
  };

  const deleteBenchmark = (id) => {
    const updated = benchmarks.filter(b => b.id !== id);
    localStorage.setItem('gameBenchmarks', JSON.stringify(updated));
    setBenchmarks(updated);
    showNotification('Đã xóa benchmark');
  };

  // Aggregate stats
  const benchmarkStats = {
    rest: { avgAll: 0, minAll: Infinity, maxAll: 0, totalRequests: 0, successRate: 0 },
    graphql: { avgAll: 0, minAll: Infinity, maxAll: 0, totalRequests: 0, successRate: 0 },
    grpc: { avgAll: 0, minAll: Infinity, maxAll: 0, totalRequests: 0, successRate: 0 },
  };

  if (benchmarks.length > 0) {
    ['rest', 'graphql', 'grpc'].forEach(type => {
      const avgs = benchmarks.map(b => b[type]?.avg || 0).filter(v => v > 0);
      const mins = benchmarks.map(b => b[type]?.min || Infinity).filter(v => v < Infinity);
      const maxs = benchmarks.map(b => b[type]?.max || 0).filter(v => v > 0);
      const totalSuccess = benchmarks.reduce((s, b) => s + (b[type]?.success || 0), 0);
      const totalFail = benchmarks.reduce((s, b) => s + (b[type]?.fail || 0), 0);
      const totalReq = totalSuccess + totalFail;

      benchmarkStats[type].avgAll = avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
      benchmarkStats[type].minAll = mins.length > 0 ? Math.min(...mins) : 0;
      benchmarkStats[type].maxAll = maxs.length > 0 ? Math.max(...maxs) : 0;
      benchmarkStats[type].totalRequests = totalReq;
      benchmarkStats[type].successRate = totalReq > 0 ? ((totalSuccess / totalReq) * 100).toFixed(1) : 0;
    });
  }

  const getFastestProtocol = () => {
    if (benchmarks.length === 0) return null;
    const avgs = {
      REST: benchmarkStats.rest.avgAll,
      GraphQL: benchmarkStats.graphql.avgAll,
      gRPC: benchmarkStats.grpc.avgAll,
    };
    const valid = Object.entries(avgs).filter(([, v]) => v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a[1] < b[1] ? a : b)[0];
  };

  const getSlowestProtocol = () => {
    if (benchmarks.length === 0) return null;
    const avgs = {
      REST: benchmarkStats.rest.avgAll,
      GraphQL: benchmarkStats.graphql.avgAll,
      gRPC: benchmarkStats.grpc.avgAll,
    };
    const valid = Object.entries(avgs).filter(([, v]) => v > 0);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };

  // === CHARTS ===

  // Bar chart - Average latency comparison
  const avgBarData = {
    labels: benchmarks.map((b, i) => `#${i + 1} (×${b.count})`),
    datasets: [
      { label: 'REST (avg ms)', data: benchmarks.map(b => b.rest?.avg || 0), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6 },
      { label: 'GraphQL (avg ms)', data: benchmarks.map(b => b.graphql?.avg || 0), backgroundColor: 'rgba(236, 72, 153, 0.7)', borderColor: '#ec4899', borderWidth: 1, borderRadius: 6 },
      { label: 'gRPC (avg ms)', data: benchmarks.map(b => b.grpc?.avg || 0), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6 },
    ],
  };

  // Line chart - Total time trend
  const totalLineData = {
    labels: benchmarks.map((_, i) => `#${i + 1}`),
    datasets: [
      { label: 'REST Total', data: benchmarks.map(b => b.rest?.total || 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.08)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2 },
      { label: 'GraphQL Total', data: benchmarks.map(b => b.graphql?.total || 0), borderColor: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.08)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2 },
      { label: 'gRPC Total', data: benchmarks.map(b => b.grpc?.total || 0), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2 },
    ],
  };

  // Min/Max range chart
  const rangeBarData = {
    labels: ['REST', 'GraphQL', 'gRPC'],
    datasets: [
      { label: 'Min (ms)', data: [benchmarkStats.rest.minAll, benchmarkStats.graphql.minAll, benchmarkStats.grpc.minAll].map(v => v === Infinity ? 0 : v), backgroundColor: ['rgba(59, 130, 246, 0.4)', 'rgba(236, 72, 153, 0.4)', 'rgba(16, 185, 129, 0.4)'], borderColor: ['#3b82f6', '#ec4899', '#10b981'], borderWidth: 1, borderRadius: 6 },
      { label: 'Avg (ms)', data: [benchmarkStats.rest.avgAll, benchmarkStats.graphql.avgAll, benchmarkStats.grpc.avgAll], backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(16, 185, 129, 0.7)'], borderColor: ['#3b82f6', '#ec4899', '#10b981'], borderWidth: 1, borderRadius: 6 },
      { label: 'Max (ms)', data: [benchmarkStats.rest.maxAll, benchmarkStats.graphql.maxAll, benchmarkStats.grpc.maxAll], backgroundColor: ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)', 'rgba(16, 185, 129, 1)'], borderColor: ['#3b82f6', '#ec4899', '#10b981'], borderWidth: 1, borderRadius: 6 },
    ],
  };

  const chartBase = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { weight: 'bold', size: 11 }, usePointStyle: true, padding: 16 } },
      tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: 'rgba(139, 92, 246, 0.3)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', cornerRadius: 12, padding: 12 },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569' }, title: { display: true, text: 'ms', color: '#64748b' } },
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { size: 10 } } },
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans">
      {/* Top Navigation */}
      <nav className="bg-[#0d1225]/90 backdrop-blur-xl border-b border-white/5 px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-xl transition-all" title="Quay lại">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  Admin <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Performance Monitor</span>
                </h1>
                <p className="text-[10px] text-slate-500">{benchmarks.length} benchmark sessions recorded</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={loadBenchmarks} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white" title="Làm mới">
              <RefreshCw className="w-4 h-4" />
            </button>
            {benchmarks.length > 0 && (
              <button onClick={clearBenchmarks} className="flex items-center gap-1.5 px-4 py-2 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-500/25">
              <Zap className="w-4 h-4" /> Chạy Benchmark
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {benchmarks.length === 0 ? (
          /* Empty State */
          <div className="py-24 text-center bg-[#111827]/50 border border-dashed border-white/10 rounded-3xl">
            <Activity className="w-20 h-20 text-slate-600 mx-auto mb-6 opacity-20" />
            <p className="text-slate-400 font-semibold text-xl mb-2">Chưa có dữ liệu benchmark</p>
            <p className="text-slate-600 text-sm mb-8 max-w-md mx-auto">
              Hãy chạy benchmark từ trang Performance Lab để so sánh hiệu năng giữa REST, GraphQL và gRPC
            </p>
            <Link to="/" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-500/25">
              <Zap className="w-4 h-4" /> Đi đến Performance Lab
            </Link>
          </div>
        ) : (
          <>
            {/* === OVERVIEW STATS === */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Hash className="w-5 h-5" />} label="Sessions" value={benchmarks.length} color="violet" />
              <StatCard icon={<Timer className="w-5 h-5" />} label="Total Requests" value={benchmarkStats.rest.totalRequests + benchmarkStats.graphql.totalRequests + benchmarkStats.grpc.totalRequests} color="cyan" />
              <StatCard icon={<Flame className="w-5 h-5" />} label="Nhanh nhất" value={getFastestProtocol() || 'N/A'} color="emerald" />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Chậm nhất" value={getSlowestProtocol() || 'N/A'} color="amber" />
            </div>

            {/* === PROTOCOL COMPARISON CARDS === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { type: 'REST', stats: benchmarkStats.rest, color: 'blue', gradient: 'from-blue-600/15 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-400' },
                { type: 'GraphQL', stats: benchmarkStats.graphql, color: 'pink', gradient: 'from-pink-600/15 to-pink-600/5', border: 'border-pink-500/20', text: 'text-pink-400' },
                { type: 'gRPC', stats: benchmarkStats.grpc, color: 'emerald', gradient: 'from-emerald-600/15 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
              ].map(({ type, stats, gradient, border, text }) => {
                const isFastest = getFastestProtocol() === type;
                return (
                  <div key={type} className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-6 ${isFastest ? 'ring-1 ring-emerald-500/30' : ''} transition-all hover:scale-[1.02]`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-sm font-black uppercase tracking-wider ${text}`}>{type}</span>
                      {isFastest && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                          <Flame className="w-3 h-3" /> FASTEST
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-black text-white mb-4">
                      {stats.avgAll.toFixed(1)}<span className="text-sm text-slate-500 ml-1">ms avg</span>
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Min latency</span>
                        <span className="font-bold text-slate-300">{stats.minAll === Infinity ? '—' : `${stats.minAll.toFixed(1)}ms`}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Max latency</span>
                        <span className="font-bold text-slate-300">{stats.maxAll > 0 ? `${stats.maxAll.toFixed(1)}ms` : '—'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total requests</span>
                        <span className="font-bold text-slate-300">{stats.totalRequests}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Success rate</span>
                        <span className={`font-bold ${Number(stats.successRate) >= 90 ? 'text-emerald-400' : Number(stats.successRate) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {stats.successRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* === COMPARISON BAR VISUAL === */}
            <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
              <h3 className="font-bold text-sm mb-4 text-slate-400 uppercase tracking-wider">So sánh tổng quan (Average Latency)</h3>
              <div className="space-y-4">
                {[
                  { type: 'REST', avg: benchmarkStats.rest.avgAll, color: 'from-blue-600 to-blue-400', text: 'text-blue-400' },
                  { type: 'GraphQL', avg: benchmarkStats.graphql.avgAll, color: 'from-pink-600 to-pink-400', text: 'text-pink-400' },
                  { type: 'gRPC', avg: benchmarkStats.grpc.avgAll, color: 'from-emerald-600 to-emerald-400', text: 'text-emerald-400' },
                ].map(({ type, avg, color, text }) => {
                  const maxAvg = Math.max(benchmarkStats.rest.avgAll, benchmarkStats.graphql.avgAll, benchmarkStats.grpc.avgAll);
                  const percent = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
                  const isFastest = getFastestProtocol() === type && avg > 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-sm font-bold ${text} flex items-center gap-2`}>
                          {type}
                          {isFastest && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">🏆 WINNER</span>}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{avg.toFixed(2)} ms</span>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(percent, 3)}%` }}>
                          {percent > 20 && <span className="text-[9px] font-bold text-white/80">{percent.toFixed(0)}%</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* === CHARTS === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                <Bar data={avgBarData} options={{ ...chartBase, plugins: { ...chartBase.plugins, title: { display: true, text: '📊 Average Latency per Session', color: '#e2e8f0', font: { size: 13, weight: 'bold' } } } }} />
              </div>
              <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
                <Line data={totalLineData} options={{ ...chartBase, plugins: { ...chartBase.plugins, title: { display: true, text: '⏱️ Total Time Trend', color: '#e2e8f0', font: { size: 13, weight: 'bold' } } } }} />
              </div>
            </div>

            <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
              <Bar data={rangeBarData} options={{
                ...chartBase,
                plugins: { ...chartBase.plugins, title: { display: true, text: '📈 Min / Avg / Max Latency (All Sessions)', color: '#e2e8f0', font: { size: 13, weight: 'bold' } } },
                scales: { ...chartBase.scales, x: { ...chartBase.scales.x, ticks: { color: '#94a3b8', font: { size: 13, weight: 'bold' } } } }
              }} />
            </div>

            {/* === BENCHMARK HISTORY TABLE === */}
            <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-400" /> Lịch sử Benchmark
                </h3>
                <span className="text-xs text-slate-500">{benchmarks.length} sessions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Game</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">N</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">REST</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-pink-400 uppercase tracking-wider">GraphQL</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">gRPC</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">Winner</th>
                      <th className="text-center px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarks.map((b, i) => {
                      const entries = [
                        { name: 'REST', avg: b.rest?.avg || 0 },
                        { name: 'GraphQL', avg: b.graphql?.avg || 0 },
                        { name: 'gRPC', avg: b.grpc?.avg || 0 },
                      ];
                      const valid = entries.filter(e => e.avg > 0);
                      const fastest = valid.length > 0 ? valid.reduce((a, c) => c.avg < a.avg ? c : a).name : 'N/A';
                      const d = new Date(b.timestamp);

                      return (
                        <tr key={b.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                          <td className="px-5 py-3 text-xs text-slate-500 font-mono">{i + 1}</td>
                          <td className="px-5 py-3 text-xs text-slate-400">
                            {d.toLocaleDateString('vi-VN')} <span className="text-slate-600">{d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-white font-medium max-w-[120px] truncate">{b.gameName || 'N/A'}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold rounded">{b.count}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="text-xs font-bold text-blue-400">{(b.rest?.avg || 0).toFixed(1)}<span className="text-[9px] text-slate-600 ml-0.5">ms</span></div>
                            <div className="text-[9px] text-slate-600">{b.rest?.success || 0}/{(b.rest?.success || 0) + (b.rest?.fail || 0)}</div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="text-xs font-bold text-pink-400">{(b.graphql?.avg || 0).toFixed(1)}<span className="text-[9px] text-slate-600 ml-0.5">ms</span></div>
                            <div className="text-[9px] text-slate-600">{b.graphql?.success || 0}/{(b.graphql?.success || 0) + (b.graphql?.fail || 0)}</div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="text-xs font-bold text-emerald-400">{(b.grpc?.avg || 0).toFixed(1)}<span className="text-[9px] text-slate-600 ml-0.5">ms</span></div>
                            <div className="text-[9px] text-slate-600">{b.grpc?.success || 0}/{(b.grpc?.success || 0) + (b.grpc?.fail || 0)}</div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-md">
                              <Flame className="w-2.5 h-2.5" /> {fastest}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => deleteBenchmark(b.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Xóa">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold border backdrop-blur-sm animate-slideUp ${
          notification.type === 'error' ? 'bg-red-900/80 text-red-200 border-red-500/30' : 'bg-emerald-900/80 text-emerald-200 border-emerald-500/30'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {notification.message}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const themes = {
    violet: { bg: 'from-violet-600/15 to-violet-600/5', border: 'border-violet-500/20', text: 'text-violet-400', iconBg: 'bg-violet-500/20' },
    cyan: { bg: 'from-cyan-600/15 to-cyan-600/5', border: 'border-cyan-500/20', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
    emerald: { bg: 'from-emerald-600/15 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
    amber: { bg: 'from-amber-600/15 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
  };
  const t = themes[color];
  return (
    <div className={`bg-gradient-to-br ${t.bg} rounded-2xl border ${t.border} p-5 hover:scale-[1.02] transition-transform`}>
      <div className={`w-9 h-9 ${t.iconBg} rounded-xl flex items-center justify-center ${t.text} mb-3`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
};

export default AdminPage;
