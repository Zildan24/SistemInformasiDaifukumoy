"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { BarChart3, LineChart, Filter, TrendingUp } from "lucide-react";
import { AreaChart, Area, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

import { format, subDays, startOfMonth, isAfter, isSameDay, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export default function AnalyticsPage() {
  const { products, productionLogs } = useData();
  const { currentUser } = useAuth();

  // Slicer States
  const [timeFilter, setTimeFilter] = useState<"today" | "7days" | "month" | "all" | "custom">("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // Date Range for Slider (Jan - Dec 2026)
  const allDates = useMemo(() => {
    const year = 2026;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return eachDayOfInterval({ start, end });
  }, []);

  const initialTodayIdx = useMemo(() => {
    const idx = allDates.findIndex(d => isSameDay(d, new Date()));
    return idx === -1 ? 0 : idx;
  }, [allDates]);

  const [sliderRange, setSliderRange] = useState<[number, number]>([0, allDates.length - 1]);

  // Sync Slider when quick filter clicked
  const handleQuickFilter = (type: "today" | "7days" | "month" | "all") => {
    setTimeFilter(type);
    const today = startOfDay(new Date());
    let startIdx = 0;
    const endIdx = initialTodayIdx;

    if (type === "today") {
      startIdx = initialTodayIdx;
    } else if (type === "7days") {
      startIdx = Math.max(0, initialTodayIdx - 6);
    } else if (type === "month") {
      const startOfM = startOfMonth(today);
      startIdx = allDates.findIndex(d => isSameDay(d, startOfM));
    } else {
      startIdx = 0;
    }

    if (startIdx === -1) startIdx = 0;
    setSliderRange([startIdx, type === "all" ? allDates.length - 1 : initialTodayIdx]);
  };

  // Protect route
  if (currentUser?.role !== "owner") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Owner.</div>;
  }

  // --- Filter Logic ---
  const filteredLogs = useMemo(() => {
    const startDate = allDates[sliderRange[0]];
    const endDate = endOfDay(allDates[sliderRange[1]]);

    let logs = productionLogs.filter(t => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    });
    
    // Filter by product
    if (productFilter !== "all") {
      logs = logs.filter(l => l.productId === productFilter);
    }

    // Sort by date ascending to get proper chronological order
    logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return logs;
  }, [productionLogs, sliderRange, allDates, productFilter]);

  // --- Aggregate Chart Data ---
  const chartData = useMemo(() => {
    const datesMap: Record<string, { name: string, Produksi: number, Terjual: number, Terbuang: number }> = {};
    
    filteredLogs.forEach(l => {
      if (!datesMap[l.date]) datesMap[l.date] = { name: l.date, Produksi: 0, Terjual: 0, Terbuang: 0 };
      const sisa = Math.max(0, l.morningProduction - l.soldQuantity);
      const reusableQuantity = l.reusableWaste || 0;
      const realWaste = Math.max(0, sisa - reusableQuantity);

      datesMap[l.date].Produksi += l.morningProduction;
      datesMap[l.date].Terjual += l.soldQuantity;
      datesMap[l.date].Terbuang += realWaste;
    });

    return Object.values(datesMap);
  }, [filteredLogs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 mt-2">
      
      {/* Slicer / Control Panel (Matched with Dashboard style) */}
      <div className="bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="flex flex-col xl:flex-row items-center gap-6 xl:gap-12">
          <div className="flex items-center gap-2 text-gray-700 font-bold shrink-0">
            <Filter size={20} className="text-primary"/> Filter Analitik
          </div>

          {/* Date Range Slider (Middle) */}
          <div className="flex-1 w-full px-2">
            <div className="relative h-14 flex flex-col justify-center">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 px-1">
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{format(allDates[sliderRange[0]], "dd MMM")}</span>
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{format(allDates[sliderRange[1]], "dd MMM")}</span>
              </div>
              <Slider
                range
                min={0}
                max={allDates.length - 1}
                value={sliderRange}
                onChange={(val) => {
                  setSliderRange(val as [number, number]);
                  setTimeFilter("custom");
                }}
                styles={{
                  track: { backgroundColor: '#FF65C5', height: 6 },
                  rail: { backgroundColor: '#f3f4f6', height: 6 },
                  handle: {
                    width: 18,
                    height: 18,
                    marginTop: -6,
                    backgroundColor: '#ffffff',
                    border: '3px solid #FF65C5',
                    opacity: 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button onClick={() => handleQuickFilter("today")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "today" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Hari Ini</button>
              <button onClick={() => handleQuickFilter("7days")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "7days" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>7 Hari</button>
              <button onClick={() => handleQuickFilter("month")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "month" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Bulan Ini</button>
              <button onClick={() => handleQuickFilter("all")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === "all" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Semua</button>
            </div>

            <select 
              value={productFilter} 
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Semua Produk</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart 1: Tren Volume Penjualan (Full Width Area Chart) */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Tren Volume Penjualan</h3>
            <p className="text-sm text-gray-500">Total unit barang yang berhasil terjual berdasarkan filter aktif.</p>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTerjual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF65C5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#FF65C5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" tickFormatter={(val) => val.split("-").slice(1).join("/")} />
              <YAxis fontSize={12} stroke="#9ca3af" />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" name="Total Terjual (Unit)" dataKey="Terjual" stroke="#FF65C5" strokeWidth={3} fillOpacity={1} fill="url(#colorTerjual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 2: Production Efficiency (Line Chart) */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Production Efficiency</h3>
              <p className="text-sm text-gray-500">Perbandingan Target (Produksi) vs Realisasi (Terjual).</p>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" tickFormatter={(val) => val.split("-").slice(1).join("/")} />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '13px', fontWeight: 'bold'}}/>
                <Line type="monotone" name="Total Produksi" dataKey="Produksi" stroke="#FF65C5" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" name="Berhasil Terjual" dataKey="Terjual" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Waste Tracker (Bar Chart) */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
              <LineChart size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Waste Tracker</h3>
              <p className="text-sm text-gray-500">Jumlah produk sisa murni (Basi / Loss) per hari.</p>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" tickFormatter={(val) => val.split("-").slice(1).join("/")} />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}} cursor={{fill: 'rgba(239, 68, 68, 0.05)'}} />
                <Bar name="Produk Sisa (Waste)" dataKey="Terbuang" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
