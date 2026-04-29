import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { restApi, graphqlApi, grpcApi } from '../api';
import ComparisonChart from '../components/ComparisonChart';
import protobuf from 'protobufjs';
import { Activity, Trash2, PlusCircle, RefreshCw, BarChart3, Zap, Gamepad2, Shield, Monitor, Hash, Database, Workflow, FileJson, Server, ListTree, GaugeCircle } from 'lucide-react';

const BenchmarkPage = () => {
  const [activeTab, setActiveTab] = useState('performance'); // 'performance', 'data-size', 'flexibility'

  // States for Performance Tab
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ rest: 0, graphql: 0, grpc: 0 });
  const [formData, setFormData] = useState({ name: '', price: '', platform: 'PC', description: '', downloadLink: '' });
  const [image, setImage] = useState(null);
  const [activeProtocol, setActiveProtocol] = useState('REST');
  const [history, setHistory] = useState({ rest: [], graphql: [], grpc: [] });
  const [batchCount, setBatchCount] = useState(1);
  const [batchResults, setBatchResults] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);

  // States for Data Size Tab
  const [dataSizeResults, setDataSizeResults] = useState(null);
  const [measuringSize, setMeasuringSize] = useState(false);

  // States for Flexibility Tab
  const [flexData, setFlexData] = useState(null);
  const [flexLoading, setFlexLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    id: true,
    name: true,
    price: true,
    platforms: false,
    description: false,
    image: false,
    downloadLink: false
  });
  const [queryProtocol, setQueryProtocol] = useState('REST');
  const [restMethod, setRestMethod] = useState('GET');
  const [restPath, setRestPath] = useState('/api/games');
  const [grpcProto, setGrpcProto] = useState('game.proto');
  const [protoContent, setProtoContent] = useState('');

  useEffect(() => {
    if (grpcProto) {
      fetch(`/${grpcProto}`)
        .then(res => {
          if (!res.ok) throw new Error('Not found');
          return res.text();
        })
        .then(text => {
          if (text.startsWith('<')) throw new Error('Not found');
          setProtoContent(text);
        })
        .catch(err => setProtoContent('// Không thể tải nội dung file .proto hoặc file không tồn tại'));
    }
  }, [grpcProto]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- LOGIC: PERFORMANCE ---
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
        if (isMounted && activeTab === 'performance') await fetchGames();
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeProtocol, activeTab]);

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

  const handleBatchAdd = async () => {
    if (!formData.name) return alert("Vui lòng điền tên game!");
    setBatchRunning(true);
    setLoading(true);

    let imageUrl = '';
    if (image) {
      try {
        const uploadRes = await restApi.uploadImage(image);
        imageUrl = uploadRes.data.imageUrl;
      } catch (err) { console.error("Upload error:", err); }
    }

    const results = {
      rest: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      graphql: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      grpc: { times: [], total: 0, avg: 0, min: 0, max: 0, success: 0, fail: 0 },
      count: batchCount
    };

    // Helper cho batch
    const createGameData = (i) => ({
      name: `${formData.name} #${i + 1}`,
      price: String(parseInt(formData.price) || 0),
      categoryIds: [],
      platforms: [formData.platform],
      description: formData.description || '',
      image: imageUrl,
      downloadLink: formData.downloadLink || ''
    });

    for (let i = 0; i < batchCount; i++) {
      const start = performance.now();
      try { await restApi.createGame(createGameData(i)); results.rest.times.push(performance.now() - start); results.rest.success++; }
      catch (err) { results.rest.times.push(performance.now() - start); results.rest.fail++; }
    }

    for (let i = 0; i < batchCount; i++) {
      const start = performance.now();
      try { await graphqlApi.createGame(createGameData(i), imageUrl); results.graphql.times.push(performance.now() - start); results.graphql.success++; }
      catch (err) { results.graphql.times.push(performance.now() - start); results.graphql.fail++; }
    }

    for (let i = 0; i < batchCount; i++) {
      const start = performance.now();
      try { await grpcApi.createGame(createGameData(i), imageUrl); results.grpc.times.push(performance.now() - start); results.grpc.success++; }
      catch (err) { results.grpc.times.push(performance.now() - start); results.grpc.fail++; }
    }

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
    setStats({
      rest: results.rest.avg.toFixed(2),
      graphql: results.graphql.avg.toFixed(2),
      grpc: results.grpc.avg.toFixed(2),
    });

    setBatchRunning(false);
    setLoading(false);
    fetchGames();
  };

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
      const gameData = { ...formData, price: String(parseInt(formData.price) || 0), categoryIds: [], platforms: [formData.platform], image: imageUrl };

      if (type === 'REST') await restApi.createGame(gameData);
      else if (type === 'GraphQL') await graphqlApi.createGame(gameData, imageUrl);
      else if (type === 'gRPC') await grpcApi.createGame(gameData, imageUrl);

      const duration = (performance.now() - start).toFixed(2);
      setStats(prev => ({ ...prev, [type.toLowerCase()]: duration }));
      alert(`Thành công! [${type}] phản hồi trong ${duration}ms`);
      fetchGames();
      setFormData({ name: '', price: '', platform: 'PC', description: '', downloadLink: '' });
      setImage(null);
    } catch (err) {
      alert(`Lỗi khi thực hiện qua ${type}. Kiểm tra Console!`);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bằng ${activeProtocol}?`)) return;
    try {
      if (activeProtocol === 'REST') await restApi.deleteGame(id);
      else if (activeProtocol === 'GraphQL') await graphqlApi.deleteGame(id);
      else if (activeProtocol === 'gRPC') await grpcApi.deleteGame(id);
      fetchGames();
    } catch (err) { alert(`Lỗi khi xóa qua ${activeProtocol}`); }
  };

  // --- LOGIC: DATA SIZE ---
  const measureDataSize = async () => {
    setMeasuringSize(true);
    try {
      const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:5028";

      // REST
      const resRest = await fetch(`${BASE_URL}/api/games`);
      const blobRest = await resRest.blob();
      const restSize = blobRest.size;

      // GraphQL
      const graphqlQuery = { query: "{ games { id name price categoryIds platforms platform description image downloadLink } }" };
      const resGql = await fetch(`${BASE_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlQuery)
      });
      const blobGql = await resGql.blob();
      const gqlSize = blobGql.size;

      // gRPC
      const frameRequest = (buffer) => {
        const frame = new Uint8Array(5 + buffer.length);
        frame[0] = 0;
        const len = buffer.length;
        frame[1] = (len >> 24) & 0xFF;
        frame[2] = (len >> 16) & 0xFF;
        frame[3] = (len >> 8) & 0xFF;
        frame[4] = len & 0xFF;
        frame.set(buffer, 5);
        return frame;
      };

      const root = await protobuf.load("/game.proto");
      const RequestType = root.lookupType("GameEmptyRequest");
      const buffer = RequestType.encode(RequestType.create({})).finish();

      const resGrpc = await fetch(`${BASE_URL}/GameGrpc/GetAllGames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/grpc-web+proto', 'X-Grpc-Web': '1' },
        body: frameRequest(buffer)
      });
      const blobGrpc = await resGrpc.blob();
      const grpcSize = blobGrpc.size;

      setDataSizeResults({ rest: restSize, graphql: gqlSize, grpc: grpcSize });
    } catch (err) {
      console.error(err);
      alert("Lỗi khi đo lường kích thước dữ liệu: " + err.message);
    } finally {
      setMeasuringSize(false);
    }
  };

  // --- LOGIC: CÁCH TRUY VẤN ---
  const handleRestQuery = async () => {
    setFlexLoading(true);
    try {
      const start = performance.now();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://localhost:5028"}${restPath}`, {
        method: restMethod
      });
      const blob = await res.blob();
      const size = blob.size;
      const text = await blob.text();
      let resData = text;
      try { resData = JSON.parse(text); } catch (e) { }

      setFlexData({
        type: 'REST',
        data: resData,
        size,
        time: (performance.now() - start).toFixed(2),
        queryUsed: `${restMethod} ${restPath}`
      });
    } catch (err) {
      setFlexData({ type: 'REST Lỗi', data: err.message, size: 0, time: 0, queryUsed: `${restMethod} ${restPath}` });
    } finally {
      setFlexLoading(false);
    }
  };

  const handleGrpcQuery = async () => {
    setFlexLoading(true);
    try {
      const start = performance.now();
      if (grpcProto !== 'game.proto') {
        throw new Error(`File ${grpcProto} không hợp lệ hoặc không chứa định nghĩa GameGrpc!`);
      }
      const res = await grpcApi.getAllGames();
      const size = new TextEncoder().encode(JSON.stringify(res)).length;

      setFlexData({
        type: 'gRPC',
        data: res.items || res,
        size,
        time: (performance.now() - start).toFixed(2),
        queryUsed: `gRPC Call: GameGrpc/GetAllGames\nSử dụng giao kèo: ${grpcProto}`
      });
    } catch (err) {
      setFlexData({ type: 'gRPC Lỗi', data: err.message, size: 0, time: 0, queryUsed: `Attempted to load ${grpcProto}` });
    } finally {
      setFlexLoading(false);
    }
  };

  const handleCustomGraphQLTest = async () => {
    setFlexLoading(true);
    try {
      const start = performance.now();
      const fields = Object.keys(selectedFields).filter(k => selectedFields[k]).join(' ');

      const query = `query { games { ${fields || 'id'} } }`;

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://localhost:5028"}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const resData = await res.json();
      const size = new TextEncoder().encode(JSON.stringify(resData)).length;

      setFlexData({
        type: 'GraphQL (Tùy chỉnh)',
        data: resData.data.games,
        size,
        time: (performance.now() - start).toFixed(2),
        queryUsed: query
      });
    } catch (err) {
      console.error(err);
    } finally {
      setFlexLoading(false);
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
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"> GameLab</span>
            </h1>
            <Link to="/game-demo" className="px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 rounded-xl text-sm font-semibold text-emerald-300 hover:border-emerald-400/60 transition-all flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Game Demo
            </Link>
          </div>

          <div className="flex gap-3">
            <StatCard label="REST AVG" value={stats.rest} color="blue" />
            <StatCard label="GraphQL AVG" value={stats.graphql} color="pink" />
            <StatCard label="gRPC AVG" value={stats.grpc} color="emerald" />
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-8 mb-4">
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 w-fit">
          <button onClick={() => setActiveTab('performance')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'performance' ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <GaugeCircle className="w-4 h-4" /> Hiệu Năng
          </button>
          <button onClick={() => setActiveTab('data-size')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'data-size' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Database className="w-4 h-4" /> Lượng Dữ Liệu
          </button>
          <button onClick={() => setActiveTab('flexibility')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'flexibility' ? 'bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Workflow className="w-4 h-4" /> Cách Truy Vấn
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">

        {/* --- TAB: PERFORMANCE --- */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
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
                  <button onClick={() => runStressTest('REST')} disabled={loading} className="py-2.5 bg-blue-500/10 text-blue-400 rounded-xl font-bold text-[10px] hover:bg-blue-500/20 border border-blue-500/20">TEST REST</button>
                  <button onClick={() => runStressTest('GraphQL')} disabled={loading} className="py-2.5 bg-pink-500/10 text-pink-400 rounded-xl font-bold text-[10px] hover:bg-pink-500/20 border border-pink-500/20">TEST GQL</button>
                  <button onClick={() => runStressTest('gRPC')} disabled={loading} className="py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold text-[10px] hover:bg-emerald-500/20 border border-emerald-500/20">TEST gRPC</button>
                </div>
              </div>

              {/* Add Game Form */}
              <div className="bg-[#111827]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-violet-400" /> Thêm Game & So Sánh
                </h2>
                {/* Form fields */}
                <div className="space-y-4">
                  <input type="text" value={formData.name} placeholder="Tên Game..." className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-violet-500" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={formData.platform} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-violet-500" onChange={e => setFormData({ ...formData, platform: e.target.value })}>
                      <option value="PC" className="bg-[#111827]">PC</option>
                      <option value="PlayStation" className="bg-[#111827]">PlayStation</option>
                      <option value="Xbox" className="bg-[#111827]">Xbox</option>
                      <option value="Nintendo" className="bg-[#111827]">Nintendo</option>
                      <option value="Mobile" className="bg-[#111827]">Mobile</option>
                    </select>
                    <input type="number" value={formData.price} placeholder="Giá (VNĐ)" className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-violet-500" onChange={e => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                  <input type="text" value={formData.downloadLink} placeholder="Download Link..." className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-violet-500" onChange={e => setFormData({ ...formData, downloadLink: e.target.value })} />
                  <textarea value={formData.description} placeholder="Mô tả ngắn..." rows={2} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-violet-500 resize-none" onChange={e => setFormData({ ...formData, description: e.target.value })} />

                  <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:bg-white/5 relative cursor-pointer group transition-all">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setImage(e.target.files[0])} />
                    <div className="text-violet-400 group-hover:scale-110 transition-transform mb-2 text-2xl">🎮</div>
                    <p className="text-xs font-medium text-slate-400">{image ? `✅ ${image.name}` : "Tải lên ảnh bìa game"}</p>
                  </div>

                  {/* Batch Actions */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <label className="text-[10px] font-black text-violet-300 uppercase">Số lượng:</label>
                      <input type="number" min="1" max="100" value={batchCount} onChange={e => setBatchCount(parseInt(e.target.value) || 1)} className="w-20 p-2 bg-white/10 border border-white/10 rounded-xl text-center text-white" />
                    </div>
                    <button onClick={handleBatchAdd} disabled={loading || batchRunning} className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2">
                      {batchRunning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Đang chạy...</> : <><Zap className="w-4 h-4" /> Thêm Game</>}
                    </button>
                  </div>

                  {/* Single Add Buttons */}
                  <div className="pt-3 border-t border-white/5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Hoặc thêm 1 game riêng lẻ</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleAdd('REST')} disabled={loading} className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">REST</button>
                      <button onClick={() => handleAdd('GraphQL')} disabled={loading} className="py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">GraphQL</button>
                      <button onClick={() => handleAdd('gRPC')} disabled={loading} className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] transition-all disabled:opacity-30">gRPC</button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-8 space-y-6">
              {batchResults && (
                <div className="bg-[#111827]/80 backdrop-blur-sm rounded-2xl border border-violet-500/20 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-400" /> Kết quả Batch Test</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <BatchResultCard type="REST" data={batchResults.rest} color="blue" />
                    <BatchResultCard type="GraphQL" data={batchResults.graphql} color="pink" />
                    <BatchResultCard type="gRPC" data={batchResults.grpc} color="emerald" />
                  </div>
                </div>
              )}
              <ComparisonChart dataHistory={history} />

              <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><Gamepad2 className="w-6 h-6 text-violet-400" /> Danh sách Game</h2>
                <button onClick={fetchGames} className="p-2 hover:bg-white/10 rounded-full"><RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {games.map(game => (
                  <div key={game.id} className="group bg-[#111827]/80 rounded-2xl border border-white/5 overflow-hidden flex items-center p-4 gap-4 transition-all hover:bg-white/5">
                    {game.image ? (
                      <img src={game.image.startsWith('http') ? game.image : `${import.meta.env.VITE_BACKEND_URL || "https://localhost:5028"}${game.image}`} alt={game.name} className="w-20 h-20 object-cover rounded-xl shadow-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-[#0f1423] rounded-xl flex items-center justify-center border border-white/5">
                        <Gamepad2 className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg leading-tight mb-1">{game.name}</h3>
                      <p className="text-sm text-violet-400 font-medium mb-2">{game.price} VNĐ</p>
                      <div className="flex gap-2 flex-wrap">
                        {(game.platforms || []).map(p => <span key={p} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-300 font-bold uppercase tracking-wider">{p}</span>)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(game.id)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-red-500/20 opacity-0 group-hover:opacity-100"
                      title={`Xóa bằng ${activeProtocol}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- TAB: DATA SIZE --- */}
        {activeTab === 'data-size' && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-[#111827]/80 backdrop-blur-sm rounded-3xl border border-white/5 p-8">
              <div className="flex flex-col items-center justify-center text-center space-y-4 mb-10">
                <div className="p-4 bg-emerald-500/10 rounded-full">
                  <Database className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black">So sánh Dung Lượng (Payload Size)</h2>
                <p className="text-slate-400 max-w-2xl">
                  Bài test này sẽ gửi yêu cầu tải toàn bộ danh sách Game từ server về client bằng cả 3 giao thức (REST, GraphQL, gRPC) và đo lường chính xác dung lượng mạng trả về tính bằng Bytes.
                </p>
                <button onClick={measureDataSize} disabled={measuringSize} className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:scale-105 transition-all rounded-xl font-bold text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2">
                  {measuringSize ? <><RefreshCw className="w-5 h-5 animate-spin" /> Đang đo lường...</> : <><GaugeCircle className="w-5 h-5" /> Bắt đầu Đo Lường</>}
                </button>
              </div>

              {dataSizeResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['rest', 'graphql', 'grpc'].map(type => {
                    const size = dataSizeResults[type];
                    const maxSize = Math.max(dataSizeResults.rest, dataSizeResults.graphql, dataSizeResults.grpc);
                    const percent = (size / maxSize) * 100;
                    const isSmallest = size === Math.min(dataSizeResults.rest, dataSizeResults.graphql, dataSizeResults.grpc);

                    const config = {
                      rest: { title: 'REST (JSON)', icon: <Server className="w-5 h-5" />, color: 'blue' },
                      graphql: { title: 'GraphQL (JSON)', icon: <ListTree className="w-5 h-5" />, color: 'pink' },
                      grpc: { title: 'gRPC (Protobuf)', icon: <Zap className="w-5 h-5" />, color: 'emerald' },
                    };
                    const c = config[type];

                    return (
                      <div key={type} className={`relative overflow-hidden bg-white/5 border ${isSmallest ? `border-${c.color}-500/50` : 'border-white/10'} rounded-2xl p-6`}>
                        {isSmallest && <div className={`absolute top-0 right-0 bg-${c.color}-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl`}>TỐI ƯU NHẤT</div>}
                        <div className={`flex items-center gap-3 text-${c.color}-400 mb-4`}>
                          {c.icon}
                          <h3 className="font-bold text-lg">{c.title}</h3>
                        </div>
                        <div className="text-3xl font-black text-white mb-6">
                          {formatBytes(size)}
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full bg-${c.color}-500 transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Kích thước phản hồi thô qua mạng</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: FLEXIBILITY --- */}
        {activeTab === 'flexibility' && (
          <div className="animate-fadeIn space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Information */}
              <div className="space-y-6">

                <div className="bg-[#111827]/80 rounded-3xl border border-white/5 p-8">
                  <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                    {['REST', 'GraphQL', 'gRPC'].map(p => (
                      <button
                        key={p}
                        onClick={() => setQueryProtocol(p)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${queryProtocol === p ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {queryProtocol === 'REST' && (
                    <div className="animate-fadeIn">
                      <h2 className="text-2xl font-black mb-4 flex items-center gap-3 text-blue-400"><Server className="w-6 h-6" /> Cách Truy Vấn (REST)</h2>
                      <p className="text-slate-400 mb-6 text-sm">Với REST, cần truyền chính xác Phương thức (Method) và Đường dẫn (Endpoint/ID). Dữ liệu trả về luôn là toàn bộ object đã được thiết lập sẵn bởi Server.</p>

                      <div className="flex gap-3 mb-6">
                        <select value={restMethod} onChange={e => setRestMethod(e.target.value)} className="bg-[#0f1423] border border-white/10 rounded-xl p-4 text-blue-400 font-bold outline-none cursor-pointer">
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                        <input value={restPath} onChange={e => setRestPath(e.target.value)} className="flex-1 bg-[#0f1423] border border-white/10 rounded-xl p-4 text-white font-mono outline-none focus:border-blue-500 transition-all" placeholder="/api/games" />
                      </div>

                      <button
                        onClick={handleRestQuery}
                        disabled={flexLoading}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-black shadow-lg shadow-blue-500/25 flex justify-center items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {flexLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Gửi Request
                      </button>
                    </div>
                  )}

                  {queryProtocol === 'GraphQL' && (
                    <div className="animate-fadeIn">
                      <h2 className="text-2xl font-black mb-4 flex items-center gap-3 text-pink-400"><Workflow className="w-6 h-6" /> Cách Truy Vấn (GraphQL)</h2>
                      <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                        Với GraphQL, gửi một câu truy vấn (Query) tùy chỉnh chứa tên các trường (Fields) bạn muốn lấy. Server sẽ trả về đúng dữ liệu đó, tiết kiệm băng thông.
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-8">
                        {Object.keys(selectedFields).map(field => (
                          <label key={field} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${selectedFields[field] ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${selectedFields[field] ? 'bg-pink-500 border-pink-500' : 'border-slate-500'}`}>
                              {selectedFields[field] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedFields[field]}
                              onChange={(e) => setSelectedFields({ ...selectedFields, [field]: e.target.checked })}
                              className="hidden"
                            />
                            <span className={`text-sm font-mono font-bold ${selectedFields[field] ? 'text-pink-400' : 'text-slate-400'}`}>{field}</span>
                          </label>
                        ))}
                      </div>

                      <button
                        onClick={handleCustomGraphQLTest}
                        disabled={flexLoading}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white rounded-xl font-black shadow-lg shadow-pink-500/25 flex justify-center items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {flexLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Gửi Câu Truy Vấn
                      </button>
                    </div>
                  )}

                  {queryProtocol === 'gRPC' && (
                    <div className="animate-fadeIn">
                      <h2 className="text-2xl font-black mb-4 flex items-center gap-3 text-emerald-400"><Zap className="w-6 h-6" /> Cách Truy Vấn (gRPC)</h2>
                      <p className="text-slate-400 mb-6 text-sm">
                        Với gRPC, vì dữ liệu được mã hóa nhị phân (Protobuf), Client bắt buộc phải chọn đúng file hợp đồng (.proto) trùng khớp với Server mới có thể giải mã được.
                      </p>

                      <div className="mb-8">
                        <label className="text-xs text-slate-400 mb-2 block font-bold uppercase tracking-wider">Chọn File Giao Kèo (.proto)</label>
                        <select value={grpcProto} onChange={e => setGrpcProto(e.target.value)} className="w-full bg-[#0f1423] border border-white/10 rounded-xl p-4 text-emerald-400 font-mono font-bold outline-none cursor-pointer">
                          <option value="game.proto">game.proto</option>
                        </select>

                        {protoContent && (
                          <div className="mt-4 bg-[#0a0e1a] border border-white/5 rounded-xl overflow-hidden shadow-inner animate-fadeIn">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileJson className="w-4 h-4 text-emerald-500" /> Nội dung file</span>
                              <span className="text-[10px] text-emerald-500/70 font-mono font-bold px-2 py-1 bg-emerald-500/10 rounded">READ-ONLY</span>
                            </div>
                            <div className="p-4 overflow-auto max-h-[300px] text-[11px] font-mono text-emerald-300/80 leading-relaxed">
                              <pre className="whitespace-pre-wrap">{protoContent}</pre>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleGrpcQuery}
                        disabled={flexLoading}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/25 flex justify-center items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {flexLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Gọi Hàm RPC
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Result */}
              <div className="bg-[#0f1423] rounded-3xl border border-white/10 p-6 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><FileJson className="w-5 h-5 text-slate-400" /> Kết quả Trả về</h3>
                  {flexLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                </div>

                {flexData ? (
                  <>
                    <div className="flex gap-4 mb-4 p-4 bg-[#1a2235] rounded-xl flex-wrap">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Giao thức</p>
                        <p className="font-mono text-white">{flexData.type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Dung lượng</p>
                        <p className="font-mono text-emerald-400 font-bold">{formatBytes(flexData.size)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Thời gian</p>
                        <p className="font-mono text-blue-400">{flexData.time} ms</p>
                      </div>
                      {flexData.queryUsed && (
                        <div className="w-full mt-2 pt-2 border-t border-white/5">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Yêu cầu (Request) đã gửi đi:</p>
                          <code className="text-xs text-orange-300 font-mono bg-black/40 p-2 rounded block whitespace-pre-wrap">{flexData.queryUsed}</code>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-[#0a0e1a] rounded-xl p-4 overflow-auto border border-white/5 font-mono text-xs text-slate-300 custom-scrollbar">
                      <pre>{JSON.stringify(flexData.data, null, 2)}</pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-xl">
                    <FileJson className="w-12 h-12 mb-3 opacity-20" />
                    <p>Chọn một bài test bên trái để xem kết quả</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
        <div className="flex justify-between"><span>Tổng:</span><span className="font-bold text-slate-300">{data.total.toFixed(1)}ms</span></div>
        <div className="flex justify-between"><span>Thành công:</span><span className="font-bold text-emerald-400">{data.success}/{data.success + data.fail}</span></div>
      </div>
    </div>
  );
};

export default BenchmarkPage;
