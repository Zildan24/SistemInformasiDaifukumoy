"use client";

import React, { useState, useMemo } from "react";
import { useData } from "./context/DataContext";
import { useAuth } from "./context/AuthContext";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  ChevronRight,
  Activity,
  Utensils,
  ShoppingBag,
  Store,
  Phone,
  CreditCard,
  Wallet,
  Package,
  Filter
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
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
  eachMonthOfInterval, 
  startOfYear, 
  endOfMonth, 
  isWithinInterval 
} from "date-fns";
import Link from "next/link";

// ============================================================================
// OWNER DASHBOARD COMPONENT
// ============================================================================
function OwnerDashboard() {
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
  let totalRealWasteCost = 0;

  filteredLogs.forEach(log => {
    const product = products.find(p => p.id === log.productId);
    const hpp = log.hppSnapshot ?? (product?.hpp || 0);
    const price = log.priceSnapshot ?? (product?.price || 0);

    const gross = log.soldQuantity * price;
    const hppTotal = log.soldQuantity * hpp;

    totalIncome += gross;
    totalHppModal += hppTotal;
    totalRealWasteCost += (log.realWaste || 0) * hpp;
  });

  // Net Profit = Gross Profit - (real_waste * hpp_snapshot) - Operational
  const netIncome = totalIncome - totalHppModal - totalRealWasteCost - totalOperational;

  // Zakat is calculated based on Current Month's Net Income (Resets on 1st)
  const currentMonthLogs = productionLogs.filter(l => isAfter(new Date(l.date), startOfMonth(new Date())));
  const currentMonthExpense = transactions.filter(t => t.type === "expense" && isAfter(new Date(t.date), startOfMonth(new Date())));

  let monthlyIncome = 0;
  let monthlyHpp = 0;
  let monthlyRealWasteCost = 0;
  currentMonthLogs.forEach(log => {
    const product = products.find(p => p.id === log.productId);
    const hpp = log.hppSnapshot ?? (product?.hpp || 0);
    const price = log.priceSnapshot ?? (product?.price || 0);
    
    monthlyIncome += (log.soldQuantity * price);
    monthlyHpp += (log.soldQuantity * hpp);
    monthlyRealWasteCost += ((log.realWaste || 0) * hpp);
  });

  const monthlyOperational = currentMonthExpense.filter(t => operationalCategories.includes(t.category)).reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyNet = monthlyIncome - monthlyHpp - monthlyRealWasteCost - monthlyOperational;
  const zakat = monthlyNet > 0 ? monthlyNet * 0.025 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  };

  // --- Chart Data Preparation ---

  // 1. Area Chart (Margin vs Expense over time)
  const areaChartData = useMemo(() => {
    const today = new Date();
    let data: { name: string, pemasukan: number, pengeluaran: number, dateObj: Date }[] = [];

    const getIncomeAndHpp = (logs: typeof productionLogs) => {
      let income = 0;
      let hppModal = 0;
      let realWasteCost = 0;
      logs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        const hpp = log.hppSnapshot ?? (product?.hpp || 0);
        const price = log.priceSnapshot ?? (product?.price || 0);
        
        income += (log.soldQuantity * price);
        hppModal += (log.soldQuantity * hpp);
        realWasteCost += ((log.realWaste || 0) * hpp);
      });
      return { income, hppModal, realWasteCost };
    };

    if (dateFilter === "today") {
      data = [{
        name: format(today, "dd MMM"),
        pemasukan: totalIncome,
        pengeluaran: totalOperational + totalHppModal + totalRealWasteCost,
        dateObj: today
      }];
    } else if (dateFilter === "7days" || dateFilter === "month") {
      const start = dateFilter === "7days" ? subDays(today, 6) : startOfMonth(today);
      const end = today;
      const interval = eachDayOfInterval({ start, end });

      data = interval.map(day => {
        const dayLogs = productionLogs.filter(l => isSameDay(new Date(l.date), day));
        const dayExpenses = transactions.filter(t => t.type === "expense" && isSameDay(new Date(t.date), day));

        const { income, hppModal, realWasteCost } = getIncomeAndHpp(dayLogs);
        const operasional = dayExpenses.filter(t => operationalCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(day, "dd MMM"),
          pemasukan: income,
          pengeluaran: operasional + hppModal + realWasteCost,
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

        const { income, hppModal, realWasteCost } = getIncomeAndHpp(monthLogs);
        const operasional = monthExpenses.filter(t => operationalCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(month, "MMM"),
          pemasukan: income,
          pengeluaran: operasional + hppModal + realWasteCost,
          dateObj: month
        };
      });
    }

    return data;
  }, [transactions, productionLogs, products, dateFilter, totalIncome, totalOperational, totalHppModal, totalRealWasteCost]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pemasukan = payload[0]?.value || 0;
      const pengeluaran = payload[1]?.value || 0;
      const laba = pemasukan - pengeluaran;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 font-inter">
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
      
      const gross = log.soldQuantity * (price - hpp);
      const margin = gross - ((log.realWaste || 0) * hpp);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Slicers (Filters) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row items-center gap-6 xl:gap-12">
          <div className="flex items-center gap-2 text-gray-700 font-bold shrink-0 font-montserrat">
            <Filter size={20} className="text-primary" /> Filter Dashboard
          </div>

          {/* Date Range Slider (Middle) */}
          <div className="flex-1 w-full px-2">
            <div className="relative h-14 flex flex-col justify-center">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 px-1 font-inter">
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

          <div className="flex flex-wrap items-center gap-4 shrink-0 font-inter">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="p-2.5 bg-green-50 text-green-500 rounded-2xl shrink-0"><TrendingUp size={20} /></div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-montserrat">Pemasukan</p>
            <h3 className="text-lg font-black text-gray-800 whitespace-nowrap tracking-tight font-inter">{formatCurrency(totalIncome)}</h3>
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl shrink-0"><Package size={20} /></div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-montserrat">HPP Modal</p>
            <h3 className="text-lg font-black text-gray-800 whitespace-nowrap tracking-tight font-inter">{formatCurrency(totalHppModal)}</h3>
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl shrink-0"><TrendingDown size={20} /></div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-montserrat">Pengeluaran</p>
            <h3 className="text-lg font-black text-gray-800 whitespace-nowrap tracking-tight font-inter">{formatCurrency(totalOperational)}</h3>
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5 border-l-4 border-l-primary">
          <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl shrink-0"><DollarSign size={20} /></div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-montserrat">Laba Bersih</p>
            <h3 className={`text-lg font-black whitespace-nowrap tracking-tight font-inter ${netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(netIncome)}</h3>
          </div>
        </div>
        <div className="bg-primary p-4.5 rounded-3xl shadow-lg shadow-primary/30 flex items-center gap-3.5 text-white transform hover:scale-[1.02] transition-transform">
          <div className="p-2.5 bg-white/20 rounded-2xl shrink-0"><Package size={20} /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider font-montserrat">Zakat (Bulan Ini)</p>
            <h3 className="text-lg font-black whitespace-nowrap tracking-tight font-inter">{formatCurrency(zakat)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products Bar Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-1 font-montserrat">Top 5 Produk Terlaris</h3>
          <p className="text-xs text-gray-400 mb-4 font-inter">Jumlah unit terjual (Hero Product)</p>
          <div className="h-[250px] w-full">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} stroke="#4b5563" />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }} />
                  <Bar dataKey="terjual" fill="#FF65C5" radius={[0, 4, 4, 0]} barSize={20}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-xs font-inter">Tidak ada data untuk filter ini.</div>
            )}
          </div>
        </div>

        {/* Channel Contribution Donut Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-1 font-montserrat">Profit per Kanal</h3>
          <p className="text-xs text-gray-400 mb-4 font-inter">Persentase Laba Kotor (Margin) per kanal</p>
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
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-xs font-inter">Tidak ada data untuk filter ini.</div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Full-Width Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-1 font-montserrat">Tren Keuangan {dateFilter === "all" ? "Tahunan" : "Berkala"}</h3>
            <p className="text-xs text-gray-400 font-inter">Perbandingan Total Margin vs Pengeluaran</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 font-inter">
            <div className="flex items-center gap-1.5 text-green-600">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Total Margin
            </div>
            <div className="flex items-center gap-1.5 text-pink-500">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div> Pengeluaran
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
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
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

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================
function AdminDashboard() {
  const {
    preOrders,
    products,
    stocks,
    transactions,
    productionLogs,
    rawMaterials,
    stockTransfers
  } = useData();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. CALCULATIONS: SCORECARDS & METRICS
  const pendingPOs = useMemo(() => {
    return preOrders.filter(po => po.status === "pesanan diterima");
  }, [preOrders]);
  
  const pendingPOCount = useMemo(() => {
    const groups = new Set();
    pendingPOs.forEach(po => {
      groups.add(`${po.resellerId}_${po.pickupDate}`);
    });
    return groups.size;
  }, [pendingPOs]);

  const todayPOs = useMemo(() => {
    return preOrders.filter(po => po.pickupDate === todayStr);
  }, [preOrders, todayStr]);

  const todayPOQty = useMemo(() => {
    return todayPOs.reduce((sum, po) => sum + po.quantity, 0);
  }, [todayPOs]);

  const todayPORevenue = useMemo(() => {
    return todayPOs.reduce((sum, po) => {
      const p = products.find(prod => prod.id === po.productId);
      return sum + (p?.price || 0) * po.quantity;
    }, 0);
  }, [todayPOs, products]);

  const todayLogs = useMemo(() => {
    return productionLogs.filter(log => log.date === todayStr);
  }, [productionLogs, todayStr]);

  const todayOmset = useMemo(() => {
    if (todayLogs.length > 0) {
      return todayLogs.reduce((sum, log) => {
        const p = products.find(prod => prod.id === log.productId);
        const price = log.priceSnapshot ?? (p?.price || 0);
        return sum + (log.soldQuantity * price);
      }, 0);
    }
    return todayPORevenue;
  }, [todayLogs, products, todayPORevenue]);

  const todaySoldQty = useMemo(() => {
    if (todayLogs.length > 0) {
      return todayLogs.reduce((sum, log) => sum + log.soldQuantity, 0);
    }
    return todayPOQty;
  }, [todayLogs, todayPOQty]);

  const todayHpp = useMemo(() => {
    if (todayLogs.length > 0) {
      return todayLogs.reduce((sum, log) => {
        const p = products.find(prod => prod.id === log.productId);
        const hpp = log.hppSnapshot ?? (p?.hpp || 0);
        return sum + (log.soldQuantity * hpp);
      }, 0);
    }
    return todayPOs.reduce((sum, po) => {
      const p = products.find(prod => prod.id === po.productId);
      return sum + (p?.hpp || 0) * po.quantity;
    }, 0);
  }, [todayLogs, todayPOs, products]);

  const todayExpenseAmount = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense" && t.date.startsWith(todayStr))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, todayStr]);

  const todayWasteCost = useMemo(() => {
    return todayLogs.reduce((sum, log) => {
      const p = products.find(prod => prod.id === log.productId);
      const hpp = log.hppSnapshot ?? (p?.hpp || 0);
      return sum + ((log.realWaste || 0) * hpp);
    }, 0);
  }, [todayLogs, products]);

  const todayNetProfit = useMemo(() => {
    return todayOmset - todayHpp - todayExpenseAmount - todayWasteCost;
  }, [todayOmset, todayHpp, todayExpenseAmount, todayWasteCost]);

  const criticalRawMaterials = useMemo(() => {
    return rawMaterials.filter(rm => rm.currentStock <= rm.minStock);
  }, [rawMaterials]);
  const criticalRawMaterialsCount = criticalRawMaterials.length;

  // 3. CHARTS DATA PREPARATION
  const weeklyPOChartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayPOs = preOrders.filter(po => po.pickupDate === dateStr);
      const qty = dayPOs.reduce((sum, po) => sum + po.quantity, 0);
      const revenue = dayPOs.reduce((sum, po) => {
        const p = products.find(prod => prod.id === po.productId);
        return sum + (p?.price || 0) * po.quantity;
      }, 0);
      data.push({
        label: format(date, "dd MMM"),
        qty,
        revenue
      });
    }
    return data;
  }, [preOrders, products]);

  const cashflowChartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayIncomes = transactions.filter(
        t => t.type === "income" && t.date.startsWith(dateStr)
      );
      const dayExpenses = transactions.filter(
        t => t.type === "expense" && t.date.startsWith(dateStr)
      );

      data.push({
        label: format(date, "dd MMM"),
        pemasukan: dayIncomes.reduce((sum, t) => sum + t.amount, 0),
        pengeluaran: dayExpenses.reduce((sum, t) => sum + t.amount, 0)
      });
    }
    return data;
  }, [transactions]);

  const stockDistributionData = useMemo(() => {
    const totalGudang = stocks.reduce((sum, s) => sum + s.quantityActual, 0);
    const totalStand = stockTransfers
      .filter(t => t.date === todayStr)
      .reduce((sum, t) => sum + t.quantity, 0);

    return [
      { name: "Gudang Pusat", value: totalGudang },
      { name: "Stan/Reseller", value: totalStand }
    ];
  }, [stocks, stockTransfers, todayStr]);

  const hasStockData = useMemo(() => {
    return stockDistributionData.some(d => d.value > 0);
  }, [stockDistributionData]);

  const topResellers = useMemo(() => {
    const salesMap: Record<string, { qty: number; revenue: number }> = {};
    preOrders.forEach(po => {
      const poDate = new Date(po.createdAt || po.pickupDate);
      if (poDate >= sevenDaysAgo) {
        const p = products.find(prod => prod.id === po.productId);
        const subtotal = (p?.price || 0) * po.quantity;
        if (!salesMap[po.resellerName]) {
          salesMap[po.resellerName] = { qty: 0, revenue: 0 };
        }
        salesMap[po.resellerName].qty += po.quantity;
        salesMap[po.resellerName].revenue += subtotal;
      }
    });
    return Object.entries(salesMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [preOrders, products, sevenDaysAgo]);

  const latestPendingPOs = useMemo(() => {
    return pendingPOs.slice(0, 5);
  }, [pendingPOs]);

  const pickupReminders = useMemo(() => {
    return preOrders.filter(
      po =>
        po.pickupDate === todayStr &&
        po.status !== "selesai" &&
        po.status !== "siap diambil"
    );
  }, [preOrders, todayStr]);

  const COLORS = ["#FF65C5", "#fbbf24", "#3b82f6", "#10b981", "#8b5cf6"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Activity className="text-primary" size={24} /> Pusat Komando Admin
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-inter">
            Metrik operasional terpusat Daifukumoy Management System.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-1.5 rounded-2xl border border-gray-100 shrink-0">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-bold text-gray-700 font-inter">
            {format(new Date(), "EEEE, d MMMM yyyy", {})}
          </span>
        </div>
      </div>

      {/* Scorecards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-inter">
        {/* Omset Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-montserrat">Omset Hari Ini</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5 truncate">
              {formatCurrency(todayOmset)}
            </h3>
            <p className="text-[9px] text-green-500 font-semibold mt-0.5">{todaySoldQty} pcs moci</p>
          </div>
        </div>

        {/* HPP Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-montserrat">HPP Hari Ini</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5 truncate">
              {formatCurrency(todayHpp)}
            </h3>
            <p className="text-[9px] text-blue-500 font-semibold mt-0.5">Total modal produksi</p>
          </div>
        </div>

        {/* Pengeluaran Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-montserrat">Pengeluaran Hari Ini</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5 truncate">
              {formatCurrency(todayExpenseAmount)}
            </h3>
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">Operasional hari ini</p>
          </div>
        </div>

        {/* Laba Bersih Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-100/80 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-montserrat">Laba Bersih Hari Ini</p>
            <h3 className={`text-lg font-black mt-0.5 truncate ${todayNetProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatCurrency(todayNetProfit)}
            </h3>
            <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">Omset - HPP - Pengeluaran</p>
          </div>
        </div>

        {/* Critical Materials count */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
            <Utensils size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-montserrat">Bahan Kritis</p>
            <h3 className="text-xl font-black text-gray-800 mt-0.5">{criticalRawMaterialsCount} Item</h3>
            <p className="text-[9px] text-amber-500 font-semibold mt-0.5">Di bawah batas aman</p>
          </div>
        </div>
      </div>

      {/* Row 2: 70:30 Ratio Grid (Line Chart & Pickup Logs) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column (70%): Line Chart */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 lg:col-span-7 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 font-montserrat">Tren Penjualan Pre-Order</h3>
            <p className="text-xs text-gray-400 font-inter">Total kuantitas penjemputan PO reseller dalam 7 hari terakhir</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyPOChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF65C5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF65C5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                  formatter={(value: any, name?: string | number) => {
                    if (name === "revenue") return [formatCurrency(value), "Nominal"];
                    return [value + " pcs", "Kuantitas"];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="qty"
                  name="qty"
                  stroke="#FF65C5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (30%): Live Pickup Logs */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 lg:col-span-3 flex flex-col h-full space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 font-montserrat">Jadwal Penjemputan PO</h3>
            <p className="text-xs text-gray-400 font-inter">Live Pickup Logs hari ini</p>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[280px] font-inter">
            {pickupReminders.length > 0 ? (
              pickupReminders.map(po => {
                const product = products.find(p => p.id === po.productId);
                return (
                  <div key={po.id} className="flex justify-between items-center bg-yellow-50/40 p-2.5 rounded-2xl border border-yellow-100/70">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-gray-800 text-[11px] truncate">{po.resellerName}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {product?.name.replace("Daifuku ", "")} ({po.quantity} pcs)
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-yellow-100/70 text-yellow-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {po.status === "pesanan diterima" ? "Diterima" : "Dapur"}
                      </span>
                      {po.resellerPhone && (
                        <a
                          href={`https://wa.me/${po.resellerPhone.replace(/\D/g, "").replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                        >
                          <Phone size={12} fill="currentColor" strokeWidth={0} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-gray-400 font-medium">
                Tidak ada jadwal penjemputan tersisa untuk hari ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Grid (Cashflow, Donut, Resellers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Cashflow Bar Chart */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 font-montserrat">Arus Kas Harian (Mingguan)</h3>
            <p className="text-xs text-gray-400 font-inter">Pemasukan vs Pengeluaran finansial harian</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowChartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                  formatter={(val: any) => formatCurrency(val)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontFamily: 'Inter' }} />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#FF65C5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Stock Donut Chart */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 font-montserrat">Distribusi Stok Global</h3>
            <p className="text-xs text-gray-400 font-inter">Sebaran moci di gudang pusat vs stan reseller</p>
          </div>
          <div className="h-[220px] flex items-center justify-center relative">
            {hasStockData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stockDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => `${value} pcs`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", fontFamily: 'Inter' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-gray-400 font-inter">
                Belum ada data distribusi stok gudang / kirim cabang hari ini.
              </div>
            )}
          </div>
        </div>

        {/* Top Resellers Card */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-gray-800 font-montserrat">Top 3 Reseller/Stan</h3>
              <p className="text-xs text-gray-400 font-inter">Kanal paling aktif 7 hari terakhir</p>
            </div>
            <div className="space-y-2.5 font-inter">
              {topResellers.length > 0 ? (
                topResellers.map((reseller, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-[11px] truncate">{reseller.name}</p>
                      <p className="text-[9px] text-gray-400">{reseller.qty} pcs terjual</p>
                    </div>
                    <span className="font-black text-[11px] text-primary shrink-0">{formatCurrency(reseller.revenue)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  Tidak ada data penjualan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Bottom Table (Pending PO Queue) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800 font-montserrat">Antrean PO Terbaru</h3>
            <p className="text-xs text-gray-400 font-inter">5 pre-order masuk terbaru yang perlu diproses</p>
          </div>
          <Link
            href="/approval"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 font-inter"
          >
            Kelola Status <ChevronRight size={12} />
          </Link>
        </div>

        <div className="space-y-2.5 font-inter">
          {latestPendingPOs.length > 0 ? (
            latestPendingPOs.map((po) => {
              const product = products.find(p => p.id === po.productId);
              return (
                <div key={po.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                      <ShoppingBag size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-[11px] truncate">{po.resellerName}</p>
                      <p className="text-[9px] text-gray-500 truncate">
                        {product?.name} | {po.quantity} pcs
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-[11px] text-gray-700">
                      {formatCurrency((product?.price || 0) * po.quantity)}
                    </p>
                    <p className="text-[9px] text-gray-400">Ambil: {po.pickupDate}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs text-gray-400">
              Tidak ada pesanan masuk dalam antrean.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE ROUTER COMPONENT
// ============================================================================
export default function DashboardPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentUser?.role === "owner") {
    return <OwnerDashboard />;
  }

  return <AdminDashboard />;
}