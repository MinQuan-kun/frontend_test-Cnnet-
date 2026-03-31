import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { restApi, graphqlApi, grpcApi } from '../api';
import ComparisonChart from '../components/ComparisonChart';
import { Activity, Trash2, PlusCircle, RefreshCw, BarChart3, Zap, Gamepad2, Shield, Star, Monitor, Hash } from 'lucide-react';

const BenchmarkPage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ rest: 0, graphql: 0, grpc: 0 });
  const [formData, setFormData] = useState({ name: '', genre: '', price: '', platform: 'PC', description: '', rating: '' });
  const [image, setImage] = useState(null);
  const [activeProtocol, setActiveProtocol] = useState('REST');
  const [history, setHistory] = useState({ rest: [], graphql: [], grpc: [] });
  const [batchCount, setBatchCount] = useState(1); // Số lượng game cần thêm
  const [batchResults, setBatchResults] = useState(null); // Kết quả batch add
  const [batchRunning, setBatchRunning] = useState(false);

  const runStressTest = async (type) => {
    setLoading(true);
    const iterations = 50;
    let latencies = [];
    setHistory(prev => ({ ...prev, [type.toLowerCase()]: [] }));

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        if (type === 'REST') await restApi.getAllGames();
        else if (type === 'gRPC') await grpcApi.getAllGames();
        else if (type === 'GraphQL') await graphqlApi.getAllGames();
        const duration = performance.now() - start;
        latencies.push(duration);
      } catch (err) {
        console.error(err);
        latencies.push(0);
      }
    }
    setHistory(prev => ({ ...prev, [type.toLowerCase()]: latencies }));
    setLoading(false);
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      const start = performance.now();
      let data = [];

      if (activeProtocol === 'REST') {
        const res = await restApi.getAllGames();
        data = res.data;
      } else if (activeProtocol === 'gRPC') {
        const res = await grpcApi.getAllGames();
        data = res.items || [];
      } else if (activeProtocol === 'GraphQL') {
        const res = await graphqlApi.getAllGames();
        data = res.data.games || [];
      }

      const duration = (performance.now() - start).toFixed(2);
      setStats(prev => ({ ...prev, [activeProtocol.toLowerCase()]: duration }));
      setGames(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        if (isMounted) await fetchGames();
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeProtocol]);

  // Batch add: thêm N game qua cả 3 giao thức và so sánh
  const handleBatchAdd = async () => {
    if (!formData.name || !formData.genre) {
      return alert("Vui lòng điền tên và thể loại game!");
    }

    setBatchRunning(true);
    setLoading(true);

    let imageUrl = '';
    if (image) {
      try {
        const uploadRes = await restApi.uploadImage(image);
        imageUrl = uploadRes.data.imageUrl;
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    const results = {
      rest: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      graphql: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      grpc: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      count: batchCount
    };

    // Test REST
    for (let i = 0; i < batchCount; i++) {
      const gameData = {
        ...formData,
        name: `${formData.name} #${i + 1}`,
        price: parseInt(formData.price) || 0,
        rating: parseFloat(formData.rating) || 0,
        imageUrl
      };
      const start = performance.now();
      try {
        await restApi.createGame(gameData);
        const duration = performance.now() - start;
        results.rest.times.push(duration);
        results.rest.success++;
      } catch (err) {
        const duration = performance.now() - start;
        results.rest.times.push(duration);
        results.rest.fail++;
      }
    }

    // Test GraphQL
    for (let i = 0; i < batchCount; i++) {
      const gameData = {
        ...formData,
        name: `${formData.name} #${i + 1}`,
        price: parseInt(formData.price) || 0,
        rating: parseFloat(formData.rating) || 0,
      };
      const start = performance.now();
      try {
        await graphqlApi.createGame(gameData, imageUrl);
        const duration = performance.now() - start;
        results.graphql.times.push(duration);
        results.graphql.success++;
      } catch (err) {
        const duration = performance.now() - start;
        results.graphql.times.push(duration);
        results.graphql.fail++;
      }
    }

    // Test gRPC
    for (let i = 0; i < batchCount; i++) {
      const gameData = {
        ...formData,
        name: `${formData.name} #${i + 1}`,
        price: parseInt(formData.price) || 0,
        rating: parseFloat(formData.rating) || 0,
      };
      const start = performance.now();
      try {
        await grpcApi.createGame(gameData, imageUrl);
        const duration = performance.now() - start;
        results.grpc.times.push(duration);
        results.grpc.success++;
      } catch (err) {
        const duration = performance.now() - start;
        results.grpc.times.push(duration);
        results.grpc.fail++;
      }
    }

    // Tính toán thống kê
    ['rest', 'graphql', 'grpc'].forEach(type => {
      const times = results[type].times;
      if (times.length > 0) {
        results[type].total = times.reduce((a, b) => a + b, 0);
        results[type].avg = results[type].total / times.length;
        results[type].min = Math.min(...times);
        results[type].max = Math.max(...times);
      }
    });

    setBatchResults(results);

    // Lưu vào localStorage cho Admin Page
    const savedBenchmarks = JSON.parse(localStorage.getItem('gameBenchmarks') || '[]');
    savedBenchmarks.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      count: batchCount,
      gameName: formData.name,
      rest: { avg: results.rest.avg, total: results.rest.total, min: results.rest.min, max: results.rest.max, success: results.rest.success, fail: results.rest.fail },
      graphql: { avg: results.graphql.avg, total: results.graphql.total, min: results.graphql.min, max: results.graphql.max, success: results.graphql.success, fail: results.graphql.fail },
      grpc: { avg: results.grpc.avg, total: results.grpc.total, min: results.grpc.min, max: results.grpc.max, success: results.grpc.success, fail: results.grpc.fail },
    });
    localStorage.setItem('gameBenchmarks', JSON.stringify(savedBenchmarks));

    setStats({
      rest: results.rest.avg.toFixed(2),
      graphql: results.graphql.avg.toFixed(2),
      grpc: results.grpc.avg.toFixed(2),
    });

    setBatchRunning(false);
    setLoading(false);
    fetchGames();
  };

  // Single add
  const handleAdd = async (type) => {
    if (!formData.name) return alert("Vui lòng điền tên game!");
    setLoading(true);

    try {
      let imageUrl = '';
      if (image) {
        const uploadRes = await restApi.uploadImage(image);
        imageUrl = uploadRes.data.imageUrl;
      }

      let start = performance.now();

      if (type === 'REST') {
        await restApi.createGame({ ...formData, imageUrl, price: parseInt(formData.price) || 0, rating: parseFloat(formData.rating) || 0 });
      } else if (type === 'GraphQL') {
        await graphqlApi.createGame(formData, imageUrl);
      } else if (type === 'gRPC') {
        await grpcApi.createGame(formData, imageUrl);
      }

      const duration = (performance.now() - start).toFixed(2);
      setStats(prev => ({ ...prev, [type.toLowerCase()]: duration }));
      alert(`Thành công! [${type}] phản hồi trong ${duration}ms`);
      fetchGames();
      setFormData({ name: '', genre: '', price: '', platform: 'PC', description: '', rating: '' });
      setImage(null);
    } catch (err) {
      alert(`Lỗi khi thực hiện qua ${type}. Kiểm tra Console!`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bằng ${activeProtocol}?`)) return;
    try {
      const start = performance.now();
      if (activeProtocol === 'REST') await restApi.deleteGame(id);
      else if (activeProtocol === 'GraphQL') await graphqlApi.deleteGame(id);
      else if (activeProtocol === 'gRPC') await grpcApi.deleteGame(id);
      const duration = (performance.now() - start).toFixed(2);
      console.log(`Xóa thành công qua ${activeProtocol} trong ${duration}ms`);
      fetchGames();
    } catch (err) {
      alert(`Lỗi khi xóa qua ${activeProtocol}`);
      console.error(err);
    }
  };

  const platformIcons = { 'PC': '🖥️', 'PlayStation': '🎮', 'Xbox': '🟢', 'Nintendo': '🔴', 'Mobile': '📱' };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans">
      {/* Navigation */}
      <nav className="bg-[#0d1225]/90 backdrop-blur-xl border-b border-white/5 px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Gamepad2 className="w-9 h-9 text-violet-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              GAME <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">PERFORMANCE LAB</span>
            </h1>
            <Link to="/admin" className="ml-6 px-4 py-2 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/30 rounded-xl text-sm font-semibold text-violet-300 hover:border-violet-400/60 hover:text-violet-200 transition-all flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin Panel
            </Link>
          </div>

          <div className="flex gap-3">
            <StatCard label="REST AVG" value={stats.rest} color="blue" />
            <StatCard label="GraphQL AVG" value={stats.graphql} color="pink" />
            <StatCard label="gRPC AVG" value={stats.grpc} color="emerald" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Protocol Selector */}
          <div className="bg-[#111827]/80 backdrop-blur-sm p-5 rounded-2xl border border-white/5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giao thức hiện tại (Đọc dữ liệu)</label>
            <div className="flex gap-2 mt-3">
              {['REST', 'GraphQL', 'gRPC'].map(p => (
                <button key={p} onClick={() => setActiveProtocol(p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeProtocol === p
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                    }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Stress Test */}
          <div className="bg-[#111827]/80 backdrop-blur-sm p-5 rounded-2xl border border-white/5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GET Benchmark (50 requests)</label>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button onClick={() => runStressTest('REST')} disabled={loading} className="py-2.5 bg-blue-500/10 text-blue-400 rounded-xl font-bold text-[10px] hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-30">TEST REST</button>
              <button onClick={() => runStressTest('GraphQL')} disabled={loading} className="py-2.5 bg-pink-500/10 text-pink-400 rounded-xl font-bold text-[10px] hover:bg-pink-500/20 border border-pink-500/20 transition-all disabled:opacity-30">TEST GQL</button>
              <button onClick={() => runStressTest('gRPC')} disabled={loading} className="py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold text-[10px] hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-30">TEST gRPC</button>
            </div>
          </div>

          {/* Add Game Form */}
          <div className="bg-[#111827]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-violet-400" /> Thêm Game & So Sánh
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tên Game</label>
                <input type="text" value={formData.name} placeholder="Nhập tên game..."
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white placeholder-slate-500 transition-all"
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Thể loại</label>
                  <input type="text" value={formData.genre} placeholder="Action, RPG..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white placeholder-slate-500 transition-all"
                    onChange={e => setFormData({ ...formData, genre: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nền tảng</label>
                  <select value={formData.platform}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white transition-all"
                    onChange={e => setFormData({ ...formData, platform: e.target.value })}>
                    <option value="PC" className="bg-[#111827]">PC</option>
                    <option value="PlayStation" className="bg-[#111827]">PlayStation</option>
                    <option value="Xbox" className="bg-[#111827]">Xbox</option>
                    <option value="Nintendo" className="bg-[#111827]">Nintendo</option>
                    <option value="Mobile" className="bg-[#111827]">Mobile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Giá (VNĐ)</label>
                  <input type="number" value={formData.price} placeholder="500000"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white placeholder-slate-500 transition-all"
                    onChange={e => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Đánh giá</label>
                  <input type="number" step="0.1" min="0" max="5" value={formData.rating} placeholder="0-5"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white placeholder-slate-500 transition-all"
                    onChange={e => setFormData({ ...formData, rating: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mô tả</label>
                <textarea value={formData.description} placeholder="Mô tả ngắn..." rows={2}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white placeholder-slate-500 resize-none transition-all"
                  onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:bg-white/5 relative cursor-pointer group transition-all">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setImage(e.target.files[0])} />
                <div className="text-violet-400 group-hover:scale-110 transition-transform mb-2 text-2xl">🎮</div>
                <p className="text-xs font-medium text-slate-400">{image ? `✅ ${image.name}` : "Tải lên ảnh bìa game"}</p>
              </div>

              {/* Batch Count & Batch Add */}
              <div className="pt-4 border-t border-white/5">
                <div className="bg-gradient-to-r from-violet-600/10 to-cyan-600/10 border border-violet-500/20 rounded-xl p-4 mb-4">
                  <label className="text-[10px] font-black text-violet-300 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Hash className="w-3 h-3" /> Số lượng game (Batch Test)
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" max="100" value={batchCount}
                      onChange={e => setBatchCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="w-24 p-2.5 bg-white/10 border border-white/10 rounded-xl text-center text-white font-bold text-lg focus:ring-2 focus:ring-violet-500 outline-none" />
                    <div className="flex gap-1.5">
                      {[1, 5, 10, 20, 50].map(n => (
                        <button key={n} onClick={() => setBatchCount(n)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${batchCount === n
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Sẽ thêm {batchCount} game qua cả 3 giao thức và so sánh thời gian
                  </p>
                </div>

                <button onClick={handleBatchAdd} disabled={loading || batchRunning}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:opacity-90 text-white rounded-xl font-bold transition-all disabled:opacity-30 shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 text-sm">
                  {batchRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang chạy benchmark...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Benchmark: Thêm {batchCount} game × 3 APIs
                    </>
                  )}
                </button>
              </div>

              {/* Single Add Buttons */}
              <div className="pt-3 border-t border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Hoặc thêm 1 game riêng lẻ</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleAdd('REST')} disabled={loading}
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">
                    REST
                  </button>
                  <button onClick={() => handleAdd('GraphQL')} disabled={loading}
                    className="py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">
                    GraphQL
                  </button>
                  <button onClick={() => handleAdd('gRPC')} disabled={loading}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">
                    gRPC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column */}
        <section className="lg:col-span-8 space-y-6">
          {/* Batch Results */}
          {batchResults && (
            <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-violet-500/20 p-6 animate-slideUp">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                Kết quả Benchmark: Thêm {batchResults.count} game
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <BatchResultCard type="REST" data={batchResults.rest} color="blue" />
                <BatchResultCard type="GraphQL" data={batchResults.graphql} color="pink" />
                <BatchResultCard type="gRPC" data={batchResults.grpc} color="emerald" />
              </div>

              {/* Comparison Bar */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">So sánh tổng thời gian</p>
                {['rest', 'graphql', 'grpc'].map(type => {
                  const data = batchResults[type];
                  const maxTotal = Math.max(batchResults.rest.total, batchResults.graphql.total, batchResults.grpc.total);
                  const percent = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                  const colors = { rest: 'from-blue-600 to-blue-400', graphql: 'from-pink-600 to-pink-400', grpc: 'from-emerald-600 to-emerald-400' };
                  const labels = { rest: 'REST', graphql: 'GraphQL', grpc: 'gRPC' };
                  const fastest = Math.min(batchResults.rest.total, batchResults.graphql.total, batchResults.grpc.total);

                  return (
                    <div key={type} className="group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                          {labels[type]}
                          {data.total === fastest && data.total > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-md uppercase">Nhanh nhất</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">{data.total.toFixed(1)}ms tổng</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${colors[type]} rounded-full transition-all duration-1000`}
                          style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ComparisonChart dataHistory={history} />

          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Gamepad2 className="w-7 h-7 text-violet-400" /> Game Library
            </h2>
            <button onClick={fetchGames} className="p-2.5 hover:bg-white/10 rounded-full transition-colors active:rotate-180 duration-500">
              <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.length > 0 ? games.map(game => (
              <div key={game.id} className="bg-[#111827]/80 backdrop-blur-sm group rounded-2xl border border-white/5 overflow-hidden hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
                <div className="relative h-48 bg-[#0a0e1a]">
                  {game.imageUrl ? (
                    <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-600">
                      <Gamepad2 className="w-16 h-16 opacity-30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#111827] to-transparent"></div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {game.platform && (
                      <span className="px-2 py-1 bg-violet-600/80 backdrop-blur-sm text-[10px] font-bold text-white rounded-lg">
                        {platformIcons[game.platform] || '🎮'} {game.platform}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-4 text-white">
                    <p className="font-mono text-[10px] opacity-60">{game.id?.slice(-8)}</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-violet-300 transition-colors">{game.name}</h3>
                  {game.genre && <span className="text-xs text-cyan-400 font-medium">{game.genre}</span>}
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                        {Number(game.price).toLocaleString()}₫
                      </span>
                      {game.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-400" /> {game.rating}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDelete(game.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-16 text-center bg-[#111827]/50 border border-dashed border-white/10 rounded-3xl">
                <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-30" />
                <p className="text-slate-500 font-medium">Chưa có game. Hãy thêm game mới!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const themes = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  };
  return (
    <div className={`px-4 py-2.5 rounded-xl border ${themes[color]} backdrop-blur-sm`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-lg font-black leading-none">{value} <span className="text-[10px] font-normal uppercase opacity-60">ms</span></p>
    </div>
  );
};

const BatchResultCard = ({ type, data, color }) => {
  const themes = {
    blue: { bg: 'from-blue-600/15 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-400' },
    pink: { bg: 'from-pink-600/15 to-pink-600/5', border: 'border-pink-500/20', text: 'text-pink-400' },
    emerald: { bg: 'from-emerald-600/15 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  };
  const t = themes[color];

  return (
    <div className={`bg-gradient-to-br ${t.bg} border ${t.border} rounded-xl p-4`}>
      <p className={`text-xs font-black uppercase tracking-wider ${t.text} mb-2`}>{type}</p>
      <p className="text-2xl font-black text-white">{data.avg.toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-1">ms avg</span></p>
      <div className="mt-2 space-y-1 text-[10px] text-slate-400">
        <div className="flex justify-between">
          <span>Tổng:</span><span className="font-bold text-slate-300">{data.total.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Min:</span><span className="font-bold text-slate-300">{data.min.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Max:</span><span className="font-bold text-slate-300">{data.max.toFixed(1)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Thành công:</span><span className="font-bold text-emerald-400">{data.success}/{data.success + data.fail}</span>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkPage;
