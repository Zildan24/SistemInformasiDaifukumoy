"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useData } from "./context/DataContext";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { TrendingUp, TrendingDown, DollarSign, Package, Filter } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from "recharts";
import {
  format,
  subDays,
  startOfMonth,
  isAfter,
  isSameDay,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  subMonths,
  eachMonthOfInterval,
  startOfYear,
  endOfMonth,
  isWithinInterval
} from "date-fns";

export default function DashboardPage() {
  const { transactions, stocks, products, productionLogs } = useData();

  // Slicer States
  const [dateFilter, setDateFilter] = useState<"today" | "7days" | "month" | "all" | "custom">("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "Stand" | "Bazaar" | "Reseller">("all");

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
    setDateFilter(type);
    const today = startOfDay(new Date());
    let startIdx = 0;
    const endIdx = initialTodayIdx; // Current end is always today or max

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

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    const startDate = allDates[sliderRange[0]];
    const endDate = endOfDay(allDates[sliderRange[1]]);

    let filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    });

    if (locationFilter !== "all") {
      filtered = filtered.filter(t => t.type === "expense" || t.category === locationFilter);
    }

    return filtered;
  }, [transactions, sliderRange, allDates, locationFilter]);

  const filteredLogs = useMemo(() => {
    const startDate = allDates[sliderRange[0]];
    const endDate = endOfDay(allDates[sliderRange[1]]);

    let filtered = productionLogs.filter(l => {
      const d = new Date(l.date);
      return d >= startDate && d <= endDate;
    });

    if (locationFilter !== "all") {
      filtered = filtered.filter(l => l.canal === locationFilter);
    }
    return filtered;
  }, [productionLogs, sliderRange, allDates, locationFilter]);

  // Calculations
  const operationalCategories = ["Gaji / Honor", "Sewa Tempat", "Listrik", "Transportasi", "Operasional", "Waste/Kerugian"];
  const operationalTxs = filteredTransactions.filter(t => t.type === "expense" && operationalCategories.includes(t.category));
  const totalOperational = operationalTxs.reduce((acc, curr) => acc + curr.amount, 0);

  let totalIncome = 0;
  let totalHppModal = 0;

  filteredLogs.forEach(log => {
    const product = products.find(p => p.id === log.productId);
    const hpp = log.hppSnapshot ?? (product?.hpp || 0);
    const price = log.priceSnapshot ?? (product?.price || 0);

    const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
    const reusableQuantity = log.reusableWaste || 0;
    const wasteQuantity = Math.max(0, sisa - reusableQuantity);

    const gross = log.soldQuantity * price;
    const hppTotal = (log.soldQuantity + wasteQuantity) * hpp; // Termasuk Real Waste

    totalIncome += gross;
    totalHppModal += hppTotal;
  });

  const netIncome = totalIncome - (totalHppModal + totalOperational);

  // Zakat is calculated based on Current Month's Net Income (Resets on 1st)
  const currentMonthLogs = productionLogs.filter(l => isAfter(new Date(l.date), startOfMonth(new Date())));
  const currentMonthExpense = transactions.filter(t => t.type === "expense" && isAfter(new Date(t.date), startOfMonth(new Date())));

  let monthlyIncome = 0;
  let monthlyHpp = 0;
  currentMonthLogs.forEach(log => {
    const product = products.find(p => p.id === log.productId);
    const hpp = log.hppSnapshot ?? (product?.hpp || 0);
    const price = log.priceSnapshot ?? (product?.price || 0);
    
    const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
    const reusableQuantity = log.reusableWaste || 0;
    const wasteQuantity = Math.max(0, sisa - reusableQuantity);

    monthlyIncome += (log.soldQuantity * price);
    monthlyHpp += ((log.soldQuantity + wasteQuantity) * hpp);
  });

  const monthlyOperational = currentMonthExpense.filter(t => operationalCategories.includes(t.category)).reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyNet = monthlyIncome - (monthlyHpp + monthlyOperational);
  const zakat = monthlyNet > 0 ? monthlyNet * 0.025 : 0;

  const totalStock = stocks.reduce((acc, curr) => acc + curr.quantityActual, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
  };

  // --- Chart Data Preparation ---

  // 1. Area Chart (Margin vs Expense over time)
  const areaChartData = useMemo(() => {
    const today = new Date();
    let data: { name: string, pemasukan: number, pengeluaran: number, dateObj: Date }[] = [];

    const getIncomeAndHpp = (logs: typeof productionLogs) => {
      let income = 0;
      let hppModal = 0;
      logs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        const hpp = log.hppSnapshot ?? (product?.hpp || 0);
        const price = log.priceSnapshot ?? (product?.price || 0);
        
        const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
        const reusableQuantity = log.reusableWaste || 0;
        const wasteQuantity = Math.max(0, sisa - reusableQuantity);

        income += (log.soldQuantity * price);
        hppModal += ((log.soldQuantity + wasteQuantity) * hpp);
      });
      return { income, hppModal };
    };

    if (dateFilter === "today") {
      data = [{
        name: format(today, "dd MMM"),
        pemasukan: totalIncome,
        pengeluaran: totalOperational + totalHppModal,
        dateObj: today
      }];
    } else if (dateFilter === "7days" || dateFilter === "month") {
      const start = dateFilter === "7days" ? subDays(today, 6) : startOfMonth(today);
      const end = today;
      const interval = eachDayOfInterval({ start, end });

      data = interval.map(day => {
        const dayLogs = productionLogs.filter(l => isSameDay(new Date(l.date), day));
        const dayExpenses = transactions.filter(t => t.type === "expense" && isSameDay(new Date(t.date), day));

        const { income, hppModal } = getIncomeAndHpp(dayLogs);
        const operasional = dayExpenses.filter(t => operationalCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(day, "dd MMM"),
          pemasukan: income,
          pengeluaran: operasional + hppModal,
          dateObj: day
        };
      });
    } else {
      const start = startOfYear(today);
      const end = endOfMonth(today);
      const months = eachMonthOfInterval({ start, end });

      data = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthLogs = productionLogs.filter(l => {
          const d = new Date(l.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        });
        const monthExpenses = transactions.filter(t => {
          const d = new Date(t.date);
          return t.type === "expense" && isWithinInterval(d, { start: monthStart, end: monthEnd });
        });

        const { income, hppModal } = getIncomeAndHpp(monthLogs);
        const operasional = monthExpenses.filter(t => operationalCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(month, "MMM"),
          pemasukan: income,
          pengeluaran: operasional + hppModal,
          dateObj: month
        };
      });
    }

    return data;
  }, [transactions, productionLogs, products, dateFilter]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pemasukan = payload[0]?.value || 0;
      const pengeluaran = payload[1]?.value || 0;
      const laba = pemasukan - pengeluaran;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600 flex justify-between gap-4">
              <span>Pemasukan Kotor:</span> <span>{formatCurrency(pemasukan)}</span>
            </p>
            <p className="text-sm text-pink-500 flex justify-between gap-4">
              <span>Total Biaya (HPP+Opr):</span> <span>{formatCurrency(pengeluaran)}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800 flex justify-between gap-4">
                <span>Laba Bersih:</span> <span>{formatCurrency(laba)}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 2. Horizontal Bar Chart (Top 5 Products)
  const topProductsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(l => {
      if (l.productId) {
        counts[l.productId] = (counts[l.productId] || 0) + l.soldQuantity;
      }
    });

    const data = Object.keys(counts).map(pid => {
      const p = products.find(prod => prod.id === pid);
      return {
        name: p ? p.name.replace("Daifuku ", "") : "Unknown",
        terjual: counts[pid]
      };
    }).sort((a, b) => b.terjual - a.terjual).slice(0, 5); // Get Top 5

    return data;
  }, [filteredLogs, products]);

  // 3. Donut Chart (Channel Contribution - Profit per Kanal)
  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const canal = log.canal || "Lainnya";
      const product = products.find(p => p.id === log.productId);
      const hpp = log.hppSnapshot ?? (product?.hpp || 0);
      const price = log.priceSnapshot ?? (product?.price || 0);
      
      const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
      const reusableQuantity = log.reusableWaste || 0;
      const wasteQuantity = Math.max(0, sisa - reusableQuantity);

      const margin = (log.soldQuantity * price) - ((log.soldQuantity + wasteQuantity) * hpp);

      if (margin > 0) {
        channels[canal] = (channels[canal] || 0) + margin;
      }
    });

    return Object.keys(channels).map(canal => ({
      name: canal,
      value: channels[canal]
    }));
  }, [filteredLogs, products]);

  const COLORS = ['#FF65C5', '#FC98CA', '#FBD7EC', '#fcd34d', '#fbbf24'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Slicers (Filters) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row items-center gap-6 xl:gap-12">
          <div className="flex items-center gap-2 text-gray-700 font-bold shrink-0">
            <Filter size={20} className="text-primary" /> Filter Dashboard
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

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button onClick={() => handleQuickFilter("today")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === "today" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Hari Ini</button>
              <button onClick={() => handleQuickFilter("7days")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === "7days" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>7 Hari</button>
              <button onClick={() => handleQuickFilter("month")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === "month" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Bulan Ini</button>
              <button onClick={() => handleQuickFilter("all")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === "all" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>Semua</button>
            </div>
            <select
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value as any)}
            >
              <option value="all">Semua Lokasi</option>
              <option value="Stand">Stand</option>
              <option value="Bazaar">Bazaar</option>
              <option value="Reseller">Reseller</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2.5">
          <div className="p-2 bg-green-100 text-green-600 rounded-xl shrink-0"><TrendingUp size={18} /></div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-medium truncate uppercase tracking-wider">Pemasukan</p>
            <h3 className="text-[15px] font-black text-gray-800 whitespace-nowrap tracking-tight">{formatCurrency(totalIncome)}</h3>
          </div>
        </div>
        <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0"><Package size={18} /></div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-medium truncate uppercase tracking-wider">HPP Modal</p>
            <h3 className="text-[15px] font-black text-gray-800 whitespace-nowrap tracking-tight">{formatCurrency(totalHppModal)}</h3>
          </div>
        </div>
        <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2.5">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0"><TrendingDown size={18} /></div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-medium truncate uppercase tracking-wider">Pengeluaran</p>
            <h3 className="text-[15px] font-black text-gray-800 whitespace-nowrap tracking-tight">{formatCurrency(totalOperational)}</h3>
          </div>
        </div>
        <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2.5 border-l-4 border-l-primary">
          <div className="p-2 bg-accent text-primary rounded-xl shrink-0"><DollarSign size={18} /></div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 font-medium truncate uppercase tracking-wider">Laba Bersih</p>
            <h3 className="text-[15px] font-black text-gray-800 whitespace-nowrap tracking-tight">{formatCurrency(netIncome)}</h3>
          </div>
        </div>
        <div className="bg-primary p-3 lg:p-4 rounded-2xl shadow-lg shadow-primary/30 flex items-center gap-2.5 text-white transform hover:scale-[1.02] transition-transform">
          <div className="p-2 bg-white/20 rounded-xl shrink-0"><Package size={18} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/90 truncate uppercase tracking-wider">Zakat (Bulan Ini)</p>
            <h3 className="text-[15px] font-black whitespace-nowrap tracking-tight">{formatCurrency(zakat)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Top 5 Produk Terlaris</h3>
          <p className="text-sm text-gray-500 mb-4">Jumlah unit terjual (Hero Product)</p>
          <div className="h-[250px] w-full">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} stroke="#4b5563" />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="terjual" fill="#FF65C5" radius={[0, 4, 4, 0]} barSize={20}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm">Tidak ada data untuk filter ini.</div>
            )}
          </div>
        </div>

        {/* Channel Contribution Donut Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Profit per Kanal</h3>
          <p className="text-sm text-gray-500 mb-4">Persentase Laba Kotor (Margin) per kanal</p>
          <div className="h-[250px] w-full">
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm">Tidak ada data untuk filter ini.</div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Full-Width Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Tren Keuangan {dateFilter === "all" ? "Tahunan" : "Berkala"}</h3>
            <p className="text-sm text-gray-500">Perbandingan Total Margin vs Pengeluaran</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-green-600">
              <div className="w-3 h-3 rounded-full bg-green-500"></div> Total Margin
            </div>
            <div className="flex items-center gap-1.5 text-pink-500">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div> Pengeluaran
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF65C5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF65C5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `Rp${value / 1000000}jt`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pemasukan"
                name="Pemasukan"
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPemasukan)"
              />
              <Area
                type="monotone"
                dataKey="pengeluaran"
                name="Pengeluaran"
                stroke="#FF65C5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPengeluaran)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}