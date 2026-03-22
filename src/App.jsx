import React, { useState, useEffect } from 'react';
import { restApi, graphqlApi, grpcApi } from './api';
import ComparisonChart from './components/ComparisonChart';
import { Database, Activity, Trash2, PlusCircle, RefreshCw, BarChart3, Zap } from 'lucide-react';
const App = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ rest: 0, graphql: 0, grpc: 0 });
  const [formData, setFormData] = useState({ title: '', author: '', price: '' });
  const [image, setImage] = useState(null);
  const [activeProtocol, setActiveProtocol] = useState('REST'); // Mặc định là REST
  const [history, setHistory] = useState({ rest: [], graphql: [], grpc: [] });
  const runStressTest = async (type) => {
    setLoading(true);
    const iterations = 50; 
    let latencies = [];

    setHistory(prev => ({ ...prev, [type.toLowerCase()]: [] }));

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        if (type === 'REST') await restApi.getAllBooks();
        else if (type === 'gRPC') await grpcApi.getAllBooks();
        else if (type === 'GraphQL') await graphqlApi.getAllBooks();

        const duration = performance.now() - start;
        latencies.push(duration);
      } catch (err) {
        console.error(err);
        latencies.push(0); // Ghi nhận 0 nếu lỗi
      }
    }

    // Cập nhật toàn bộ mảng kết quả vào history
    setHistory(prev => ({ ...prev, [type.toLowerCase()]: latencies }));
    setLoading(false);
  };


  // 1. Fetch dữ liệu danh sách
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const start = performance.now();
      let data = [];

      if (activeProtocol === 'REST') {
        const res = await restApi.getAllBooks();
        data = res.data;
      } else if (activeProtocol === 'gRPC') {
        const res = await grpcApi.getAllBooks();
        data = res.items || [];
      }
      else if (activeProtocol === 'GraphQL') {
        const res = await graphqlApi.getAllBooks();
        data = res.data.books || [];
      }

      const duration = (performance.now() - start).toFixed(2);
      setStats(prev => ({ ...prev, [activeProtocol.toLowerCase()]: duration }));
      setBooks(data);
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
      if (isMounted) {
        await fetchBooks();
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  loadData();

  return () => {
    isMounted = false;
  };
}, [activeProtocol]); 

  const handleAdd = async (type) => {
    if (!image || !formData.title) return alert("Vui lòng điền đủ thông tin và chọn ảnh!");
    setLoading(true);

    try {
      const uploadRes = await restApi.uploadImage(image);
      const imageUrl = uploadRes.data.imageUrl;

      let start = performance.now();

      if (type === 'REST') {
        await restApi.createBook({ ...formData, imageUrl });
      } else if (type === 'GraphQL') {
        await graphqlApi.createBook(formData, imageUrl);
      } else if (type === 'gRPC') {
        await grpcApi.createBook(formData, imageUrl);
      }

      const duration = (performance.now() - start).toFixed(2);
      setStats(prev => ({ ...prev, [type.toLowerCase()]: duration }));

      alert(`Thành công! [${type}] phản hồi trong ${duration}ms`);
      fetchBooks();
      // Reset form nhẹ
      setFormData({ title: '', author: '', price: '' });
      setImage(null);
    } catch (err) {
      alert(`Lỗi khi thực hiện qua ${type}. Kiểm tra Console!`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Hàm Xóa (Delete)
  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bằng ${activeProtocol}?`)) return;

    try {
      const start = performance.now();

      if (activeProtocol === 'REST') {
        await restApi.deleteBook(id);
      } else if (activeProtocol === 'GraphQL') {
        await graphqlApi.deleteBook(id);
      } else if (activeProtocol === 'gRPC') {
        await grpcApi.deleteBook(id);
      }

      const duration = (performance.now() - start).toFixed(2);
      console.log(`Xóa thành công qua ${activeProtocol} trong ${duration}ms`);
      fetchBooks(); // Load lại danh sách
    } catch (err) {
      alert(`Lỗi khi xóa qua ${activeProtocol}`);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Navigation & Stats Bar */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-600 w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">
              PERFORMANCE <span className="text-indigo-600">LAB</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <StatCard label="REST Latency" value={stats.rest} color="blue" />
            <StatCard label="GraphQL Mutation" value={stats.graphql} color="pink" />
            <StatCard label="gRPC Binary" value={stats.grpc} color="emerald" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Input Control */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase">Giao thức hiện tại</label>
            <div className="flex gap-2 mt-2">
              {['REST', 'GraphQL', 'gRPC'].map(p => (
                <button
                  key={p}
                  onClick={() => setActiveProtocol(p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeProtocol === p
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Test (50 requests)</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button onClick={() => runStressTest('REST')} className="py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-100">TEST REST</button>
              <button onClick={() => runStressTest('GraphQL')} className="py-2 bg-pink-50 text-pink-600 rounded-lg font-bold text-[10px] hover:bg-pink-100">TEST GQL</button>
              <button onClick={() => runStressTest('gRPC')} className="py-2 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-[10px] hover:bg-emerald-100">TEST gRPC</button>
            </div>
          </div>


          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-500" /> Control Center
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tiêu đề</label>
                <input type="text" value={formData.title} placeholder="Nhập tên sách..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tác giả</label>
                <input type="text" value={formData.author} placeholder="Nhập tên tác giả..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  onChange={e => setFormData({ ...formData, author: e.target.value })} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Giá (VNĐ)</label>
                <input type="number" value={formData.price} placeholder="Ví dụ: 150000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 relative cursor-pointer group">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setImage(e.target.files[0])} />
                <div className="text-indigo-500 group-hover:scale-110 transition-transform mb-2">📁</div>
                <p className="text-xs font-medium text-slate-500">{image ? `✅ ${image.name}` : "Tải lên ảnh bìa (JPG, PNG)"}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => handleAdd('REST')} disabled={loading} className="flex justify-between items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition-all disabled:opacity-50">
                  <span className="font-bold">Gửi bằng REST</span> <Zap className="w-4 h-4 opacity-50" />
                </button>
                <button onClick={() => handleAdd('GraphQL')} disabled={loading} className="flex justify-between items-center bg-pink-600 hover:bg-pink-700 text-white px-5 py-3 rounded-xl transition-all disabled:opacity-50">
                  <span className="font-bold">Gửi bằng GraphQL</span> <Zap className="w-4 h-4 opacity-50" />
                </button>
                <button onClick={() => handleAdd('gRPC')} disabled={loading} className="flex justify-between items-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl transition-all disabled:opacity-50">
                  <span className="font-bold">Gửi bằng gRPC</span> <Zap className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </div>
          </div>

        </aside>

        {/* Right Column: Database View */}
        <section className="lg:col-span-8 space-y-6">
          <ComparisonChart dataHistory={history} />

          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Database className="w-7 h-7 text-indigo-500" /> Live Data Explorer
            </h2>
            <button onClick={fetchBooks} className="p-2 hover:bg-slate-200 rounded-full transition-colors active:rotate-180 duration-500">
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.length > 0 ? books.map(book => (
              <div key={book.id} className="bg-white group rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-52 bg-slate-100">
                  {book.imageUrl ? (
                    <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300">No Image</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Book ID</p>
                    <p className="font-mono text-xs">{book.id.slice(-8)}</p>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{book.title}</h3>
                  <p className="text-slate-500 text-sm italic mb-4">By {book.author}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-slate-900">
                      {Number(book.price).toLocaleString()} <span className="text-sm font-normal text-slate-400">₫</span>
                    </span>
                    <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
                <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Chưa có dữ liệu trong Database. Hãy thêm sách mới!</p>
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
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    pink: "text-pink-600 bg-pink-50 border-pink-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100"
  };
  return (
    <div className={`px-5 py-3 rounded-2xl border ${themes[color]} shadow-sm`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-xl font-black leading-none">{value} <span className="text-[10px] font-normal uppercase">ms</span></p>
    </div>
  );
};

export default App;