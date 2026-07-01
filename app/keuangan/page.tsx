"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { PlusCircle, MinusCircle, Wallet, History } from "lucide-react";
import { startOfMonth, isAfter, isSameDay, eachDayOfInterval, startOfDay, endOfDay, format as formatDate } from "date-fns";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";

export default function KeuanganPage() {
  const { transactions, addTransaction, channels, locations } = useData();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [type] = useState<"expense">("expense");

  // --- Filtering States ---
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"today" | "7days" | "month" | "all" | "custom">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date Range Slider Setup (Jan - Dec 2026)
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

  const selectedChannel = channels.find(c => c.name === category);
  const activeLocations = locations.filter(l => l.channelId === selectedChannel?.id && l.status === "active");

  // Handle Quick Filter Sync with Slider
  const handleTimeFilter = (type: "today" | "7days" | "month" | "all") => {
    setTimeFilter(type);
    setCurrentPage(1);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    const locationName = selectedChannel?.hasSubLocation 
      ? (locations.find(l => l.id === selectedLocationId)?.name || "")
      : category;

    addTransaction({
      type,
      amount: parseInt(amount),
      category,
      description,
      location: locationName,
      date: new Date().toISOString()
    });
    setAmount(""); setCategory(""); setSelectedLocationId(""); setDescription("");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    const startDate = allDates[sliderRange[0]];
    const endDate = endOfDay(allDates[sliderRange[1]]);

    return transactions.filter(t => {
      const d = new Date(t.date);
      const dateMatch = d >= startDate && d <= endDate;
      const typeMatch = typeFilter === "all" || t.type === typeFilter;
      const channelMatch = channelFilter === "all" || t.location?.includes(channelFilter);
      return dateMatch && typeMatch && channelMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, typeFilter, channelFilter, sliderRange, allDates]);

  // Summary based on filtered data
  const totalIncome = filteredTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);
  const activeBalance = totalIncome - totalExpense;

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedData = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 leading-relaxed font-quicksand">
      
      {/* 2. Advanced Filter Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col xl:flex-row items-center gap-8">
          <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-[11px] tracking-widest shrink-0">
            <Filter size={18} className="text-[#FF65C5]"/> Filter Lanjutan
          </div>

          {/* Date Slider */}
          <div className="flex-1 w-full px-2">
            <div className="relative h-12 flex flex-col justify-center">
              <div className="flex justify-between text-[11px] font-medium text-primary mb-1">
                <span className="bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-tight">{formatDate(allDates[sliderRange[0]], "dd MMM yyyy")}</span>
                <span className="bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-tight">{formatDate(allDates[sliderRange[1]], "dd MMM yyyy")}</span>
              </div>
              <Slider
                range min={0} max={allDates.length - 1} value={sliderRange}
                onChange={(val) => { setSliderRange(val as [number, number]); setTimeFilter("custom"); setCurrentPage(1); }}
                styles={{
                  track: { backgroundColor: '#FF65C5', height: 4 },
                  rail: { backgroundColor: '#f1f5f9', height: 4 },
                  handle: { width: 16, height: 16, marginTop: -6, backgroundColor: '#fff', border: '2px solid #FF65C5', opacity: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Type Filter */}
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  <button onClick={() => { setTypeFilter("all"); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${typeFilter === "all" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}>Semua</button>
                  <button onClick={() => { setTypeFilter("income"); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${typeFilter === "income" ? "bg-white text-emerald-500 shadow-sm" : "text-slate-600"}`}>Pemasukan</button>
                  <button onClick={() => { setTypeFilter("expense"); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${typeFilter === "expense" ? "bg-white text-red-500 shadow-sm" : "text-slate-600"}`}>Pengeluaran</button>
            </div>

            {/* Quick Time Filter */}
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
              <button onClick={() => handleTimeFilter("today")} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${timeFilter === "today" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}>Hari Ini</button>
              <button onClick={() => handleTimeFilter("7days")} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${timeFilter === "7days" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}>7 Hari</button>
              <button onClick={() => handleTimeFilter("month")} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${timeFilter === "month" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}>Bulan Ini</button>
              <button onClick={() => handleTimeFilter("all")} className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase transition-all ${timeFilter === "all" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}>Semua</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Pemasukan Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-500 shrink-0">
            <PlusCircle size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Pemasukan</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {typeFilter === "expense" ? "-" : formatCurrency(totalIncome)}
            </p>
          </div>
        </div>

        {/* Total Pengeluaran Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-red-50 text-red-500 shrink-0">
            <MinusCircle size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Pengeluaran</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {typeFilter === "income" ? "-" : formatCurrency(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit leading-relaxed">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Input Pengeluaran Operasional
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nominal (Rp)</label>
              <input 
                type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium text-slate-700"
                placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kategori</label>
              <select 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium text-slate-600"
                value={category} onChange={(e) => { setCategory(e.target.value); setSelectedLocationId(""); }} required
              >
                <option value="">-- Pilih Kategori --</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Gaji / Honor">Gaji / Honor</option>
                  <option value="Bahan Baku">Bahan Baku</option>
                  <option value="Sewa Tempat">Sewa Tempat</option>
              </select>
            </div>


            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan</label>
              <textarea 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-sm font-normal text-slate-600"
                placeholder="Detail transaksi..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            <button 
              type="submit" 
              className={`w-full py-4 rounded-2xl font-bold text-white uppercase tracking-widest transition-all transform hover:scale-[1.02] shadow-xl bg-red-500 shadow-red-500/20`}
            >
              Simpan Pengeluaran
            </button>
          </form>
        </div>

        {/* 3. Transaction History Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col leading-relaxed">
          <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <History size={20} className="text-[#FF65C5]" />
              Riwayat Transaksi
            </h3>
            
            <div className="flex items-center gap-3">
               <select 
                value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-pink-50"
              >
                <option value="all">Semua Kanal</option>
                {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <span className="text-[11px] font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-wide">
                {filteredTransactions.length} Hasil
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-medium uppercase tracking-widest">
                  <th className="p-5">Tanggal</th>
                  <th className="p-5">Sumber / Lokasi</th>
                  <th className="p-5">Keterangan</th>
                  <th className="p-5 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? paginatedData.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 text-sm font-normal text-slate-700">{formatDate(new Date(t.date), "dd MMM yyyy")}</td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-3 py-0.5 rounded-full text-[9px] font-bold uppercase ${t.type === "income" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                          {t.category}
                        </span>
                        {t.location && t.location !== t.category && (
                          <span className="text-[10px] text-slate-400 font-medium ml-1">@{t.location}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-sm font-normal text-slate-600 group-hover:text-slate-800 transition-colors leading-relaxed">{t.description || "-"}</td>
                    <td className={`p-5 text-right font-medium text-sm ${t.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-normal italic">Tidak ada transaksi ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between leading-relaxed">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Showing <span className="text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="text-slate-700">{filteredTransactions.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-primary disabled:opacity-50 disabled:hover:text-slate-400 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-xl text-[11px] font-bold transition-all ${currentPage === i + 1 ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-white text-slate-400 border border-slate-200 hover:border-primary/30"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-primary disabled:opacity-50 disabled:hover:text-slate-400 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
