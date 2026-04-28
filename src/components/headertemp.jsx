import React, { useState } from 'react';
import { Activity, Search } from 'lucide-react';
import StatCard from './StatCard';

const Header = ({ stats, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Logo and Web Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-indigo-50 p-2 rounded-xl">
            <Activity className="text-indigo-600 w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
             <span className="text-indigo-600">LAB</span>
          </h1>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-md relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-inner"
            placeholder="Tìm kiếm sách, tác giả..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Stats */}
        <div className="flex gap-4 shrink-0 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <StatCard label="REST Latency" value={stats.rest} color="blue" />
          <StatCard label="GraphQL Latency" value={stats.graphql} color="pink" />
          <StatCard label="gRPC Latency" value={stats.grpc} color="emerald" />
        </div>

      </div>
    </header>
  );
};

export default Header;


import React from 'react';

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

export default StatCard;
