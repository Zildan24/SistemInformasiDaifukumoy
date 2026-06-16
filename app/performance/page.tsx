"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { 
  format, parseISO, isWithinInterval, startOfDay, endOfDay, 
  eachDayOfInterval, isSameDay
} from "date-fns";
import { id } from "date-fns/locale";
import { BarChart3, Filter, ArrowUpDown } from "lucide-react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

type SortOption = 
  | "terlaris" | "terjarang" 
  | "untung_tertinggi" | "untung_terendah" 
  | "waste_tertinggi" | "waste_terendah" 
  | "az" | "za";

type DateFilterOption = "today" | "7days" | "1month" | "1year" | "all" | "custom";

export default function PerformancePage() {
  const { products, productionLogs, channels, locations } = useData();
  const { currentUser } = useAuth();

  // Filter States
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("7days");
  const [sortBy, setSortBy] = useState<SortOption>("terlaris");

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

  // Default to 7 days
  const [sliderRange, setSliderRange] = useState<[number, number]>([Math.max(0, initialTodayIdx - 6), initialTodayIdx]);

  // Sync Slider when quick filter clicked
  const handleQuickFilter = (type: "today" | "7days" | "1month" | "1year" | "all") => {
    setDateFilter(type);
    let startIdx = 0;

    if (type === "today") {
      startIdx = initialTodayIdx;
    } else if (type === "7days") {
      startIdx = Math.max(0, initialTodayIdx - 6);
    } else if (type === "1month") {
      startIdx = Math.max(0, initialTodayIdx - 29); // Approx 1 month
    } else if (type === "1year") {
      startIdx = Math.max(0, initialTodayIdx - 364);
    } else {
      startIdx = 0;
    }

    if (startIdx === -1) startIdx = 0;
    setSliderRange([startIdx, type === "all" ? allDates.length - 1 : initialTodayIdx]);
  };

  // Determine Date Range from Slider
  const dateRange = useMemo(() => {
    return {
      start: startOfDay(allDates[sliderRange[0]]),
      end: endOfDay(allDates[sliderRange[1]])
    };
  }, [sliderRange, allDates]);

  // Aggregate Data
  const aggregatedData = useMemo(() => {
    // 1. Filter Logs
    const filteredLogs = productionLogs.filter(log => {
      // Date Filter
      const logDate = parseISO(log.date);
      if (!isWithinInterval(logDate, { start: dateRange.start, end: dateRange.end })) return false;

      // Channel Filter
      if (selectedChannel !== "all" && log.canal !== selectedChannel) return false;

      // Location Filter (only if Stand is selected)
      const selectedChannelObj = channels.find(c => c.name === selectedChannel);
      if (selectedChannelObj?.hasSubLocation && selectedLocation !== "all") {
        if (log.subLocation !== selectedLocation) return false;
      }

      return true;
    });

    // 2. Group by Product
    const productStats: Record<string, {
      id: string;
      name: string;
      hpp: number;
      price: number;
      soldQuantity: number;
      reusableQuantity: number;
      wasteQuantity: number;
      totalHpp: number;
      totalGross: number;
      netProfit: number;
    }> = {};

    filteredLogs.forEach(log => {
      const product = products.find(p => p.id === log.productId);
      if (!product) return;

      const hpp = log.hppSnapshot ?? (product.hpp || 0);
      const price = log.priceSnapshot ?? (product.price || 0);
      
      const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
      const reusableQuantity = log.reusableWaste || 0;
      const wasteQuantity = Math.max(0, sisa - reusableQuantity);

      // Total HPP hanya memakan biaya dari yang terjual + waste murni
      const totalHpp = (log.soldQuantity + wasteQuantity) * hpp;
      const totalGross = log.soldQuantity * price;
      const netProfit = totalGross - totalHpp;

      if (!productStats[product.id]) {
        productStats[product.id] = {
          id: product.id,
          name: product.name,
          hpp: hpp, 
          price: price,
          soldQuantity: 0,
          reusableQuantity: 0,
          wasteQuantity: 0,
          totalHpp: 0,
          totalGross: 0,
          netProfit: 0,
        };
      }

      productStats[product.id].soldQuantity += log.soldQuantity;
      productStats[product.id].reusableQuantity += reusableQuantity;
      productStats[product.id].wasteQuantity += wasteQuantity;
      productStats[product.id].totalHpp += totalHpp;
      productStats[product.id].totalGross += totalGross;
      productStats[product.id].netProfit += netProfit;
    });

    // 3. Convert to array and Sort
    const result = Object.values(productStats);

    result.sort((a, b) => {
      switch (sortBy) {
        case "terlaris": return b.soldQuantity - a.soldQuantity;
        case "terjarang": return a.soldQuantity - b.soldQuantity;
        case "untung_tertinggi": return b.netProfit - a.netProfit;
        case "untung_terendah": return a.netProfit - b.netProfit;
        case "waste_tertinggi": return b.wasteQuantity - a.wasteQuantity;
        case "waste_terendah": return a.wasteQuantity - b.wasteQuantity;
        case "az": return a.name.localeCompare(b.name);
        case "za": return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    return result;
  }, [productionLogs, products, channels, selectedChannel, selectedLocation, dateRange, sortBy]);

  if (currentUser?.role !== "owner" && currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500 font-quicksand">Akses khusus Admin dan Owner.</div>;
  }

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  const selectedChannelObj = channels.find(c => c.name === selectedChannel);

  return (
    <div className="space-y-6 pb-20 mt-2">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <BarChart3 size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-quicksand font-bold text-gray-800">Detail Performa Kanal</h2>
          <p className="text-sm text-gray-500 font-inter">Analisis agregat performa produk berdasarkan filter spesifik.</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm font-montserrat font-semibold text-gray-700 border-b border-gray-50 pb-2">
          <Filter size={16} className="text-primary" /> Filter Analisis
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Kanal & Lokasi */}
          <div className="flex gap-4 flex-1 min-w-[300px]">
            <div className="flex-1">
              <label className="block text-[10px] font-montserrat font-semibold text-gray-400 uppercase ml-1 mb-1">Jenis Kanal</label>
              <select 
                value={selectedChannel} 
                onChange={(e) => { setSelectedChannel(e.target.value); setSelectedLocation("all"); }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-inter text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="all">Semua Kanal</option>
                {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {selectedChannelObj?.hasSubLocation && (
              <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-[10px] font-montserrat font-semibold text-gray-400 uppercase ml-1 mb-1">Lokasi Stand</label>
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-inter text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="all">Semua Lokasi</option>
                  {locations.filter(l => l.channelId === selectedChannelObj.id).map(l => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-montserrat font-semibold text-gray-400 uppercase ml-1 mb-1 flex items-center gap-1">
               Urutkan Berdasarkan <ArrowUpDown size={10} />
            </label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-inter text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="terlaris">Terlaris (Terjual Paling Banyak)</option>
              <option value="terjarang">Terjarang (Terjual Paling Sedikit)</option>
              <option value="untung_tertinggi">Ter-untung (Net Profit Tertinggi)</option>
              <option value="untung_terendah">Terendah (Net Profit Terendah)</option>
              <option value="waste_tertinggi">Waste Terbanyak</option>
              <option value="waste_terendah">Waste Terdikit</option>
              <option value="az">Nama Produk (A-Z)</option>
              <option value="za">Nama Produk (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Slider Row */}
        <div className="flex flex-col lg:flex-row gap-6 mt-2">
          {/* Quick Filters */}
          <div className="shrink-0">
            <label className="block text-[10px] font-montserrat font-semibold text-gray-400 uppercase ml-1 mb-2">Periode Waktu</label>
            <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
              {[
                { id: "today", label: "Hari Ini" },
                { id: "7days", label: "7 Hari" },
                { id: "1month", label: "1 Bulan" },
                { id: "1year", label: "1 Tahun" },
                { id: "all", label: "Semua" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => handleQuickFilter(f.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dateFilter === f.id ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Slider */}
          <div className="flex-1 min-w-[300px]">
            <label className="block text-[10px] font-montserrat font-semibold text-gray-400 uppercase ml-1 mb-2">Geser Rentang Waktu</label>
            <div className="relative h-10 flex flex-col justify-center px-2">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2">
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  {format(allDates[sliderRange[0]], "dd MMM yyyy", { locale: id })}
                </span>
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  {format(allDates[sliderRange[1]], "dd MMM yyyy", { locale: id })}
                </span>
              </div>
              <Slider
                range
                min={0}
                max={allDates.length - 1}
                value={sliderRange}
                onChange={(val) => {
                  setSliderRange(val as [number, number]);
                  setDateFilter("custom");
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-montserrat font-semibold text-gray-800">Rekapitulasi Produk</h3>
          <p className="text-xs font-inter text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            {aggregatedData.length} Produk Ditemukan
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left font-inter">
            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-montserrat font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-5">Nama Produk</th>
                <th className="px-6 py-5 text-right">HPP</th>
                <th className="px-6 py-5 text-right">Harga Jual</th>
                <th className="px-6 py-5 text-center">Terjual</th>
                <th className="px-6 py-5 text-center text-orange-500">Reusable</th>
                <th className="px-6 py-5 text-center text-red-500">Waste Murni</th>
                <th className="px-6 py-5 text-right text-red-500">Total HPP</th>
                <th className="px-6 py-5 text-right">Total Gross</th>
                <th className="px-6 py-5 text-right text-primary">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedData.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-gray-400 font-inter">Tidak ada data penjualan di periode dan filter ini.</td></tr>
              ) : (
                aggregatedData.map(item => (
                  <tr key={item.id} className="bg-white border-b border-gray-50 hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4 font-quicksand font-bold text-gray-800 whitespace-nowrap">{item.name}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatRp(item.hpp)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatRp(item.price)}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800">{item.soldQuantity} Pcs</td>
                    <td className={`px-6 py-4 text-center font-bold ${item.reusableQuantity > 0 ? "text-orange-500" : "text-gray-400"}`}>{item.reusableQuantity} Pcs</td>
                    <td className={`px-6 py-4 text-center font-bold ${item.wasteQuantity > 0 ? "text-red-500" : "text-gray-400"}`}>{item.wasteQuantity} Pcs</td>
                    <td className="px-6 py-4 text-right font-medium text-red-500">{formatRp(item.totalHpp)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">{formatRp(item.totalGross)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${item.netProfit < 0 ? 'text-red-500' : 'text-primary'}`}>{formatRp(item.netProfit)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {aggregatedData.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-100 font-inter font-bold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-gray-600 font-montserrat uppercase text-xs">TOTAL KESELURUHAN:</td>
                  <td className="px-6 py-4 text-center text-gray-800">{aggregatedData.reduce((acc, curr) => acc + curr.soldQuantity, 0)} Pcs</td>
                  <td className="px-6 py-4 text-center text-orange-500">{aggregatedData.reduce((acc, curr) => acc + curr.reusableQuantity, 0)} Pcs</td>
                  <td className="px-6 py-4 text-center text-red-500">{aggregatedData.reduce((acc, curr) => acc + curr.wasteQuantity, 0)} Pcs</td>
                  <td className="px-6 py-4 text-right text-red-500">{formatRp(aggregatedData.reduce((acc, curr) => acc + curr.totalHpp, 0))}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatRp(aggregatedData.reduce((acc, curr) => acc + curr.totalGross, 0))}</td>
                  <td className="px-6 py-4 text-right text-primary">{formatRp(aggregatedData.reduce((acc, curr) => acc + curr.netProfit, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
