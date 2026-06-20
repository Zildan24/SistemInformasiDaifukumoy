"use client";

import React, { useState, useMemo } from "react";
import { useData } from "./context/DataContext";
import { useAuth } from "./context/AuthContext";
import {
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
  Wallet
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
import { format, subDays } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const {
    preOrders,
    products,
    stocks,
    transactions,
    productionLogs,
    rawMaterials,
    stockTransfers
  } = useData();
  const { currentUser } = useAuth();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // ==========================================
  // 1. CALCULATIONS: SCORECARDS & METRICS
  // ==========================================

  // Total Antrean PO (status: pesanan diterima)
  const pendingPOs = useMemo(() => {
    return preOrders.filter(po => po.status === "pesanan diterima");
  }, [preOrders]);
  const pendingPOCount = pendingPOs.length;

  // Penjualan PO Hari Ini (pickupDate = today)
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

  // Pengeluaran Hari Ini (type: expense, date starting with todayStr)
  const todayExpenseAmount = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense" && t.date.startsWith(todayStr))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, todayStr]);

  // Laba Bersih Hari Ini (Omset - Pengeluaran)
  const todayNetProfit = useMemo(() => {
    return todayPORevenue - todayExpenseAmount;
  }, [todayPORevenue, todayExpenseAmount]);

  // Target Produksi Hari Ini (from planning / pickup schedule today)
  const todayProductionTarget = todayPOQty;

  // Varian Low Stock (gudang < 10)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => {
      const stock = stocks.find(s => s.productId === p.id);
      const qty = stock ? stock.quantityActual : 0;
      return p.isActive && qty < 10;
    });
  }, [products, stocks]);
  const lowStockCount = lowStockProducts.length;

  // Bahan Baku Kritis (currentStock <= minStock)
  const criticalRawMaterials = useMemo(() => {
    return rawMaterials.filter(rm => rm.currentStock <= rm.minStock);
  }, [rawMaterials]);
  const criticalRawMaterialsCount = criticalRawMaterials.length;

  // ==========================================
  // 2. ALERTS PANEL: CRITICAL ITEMS & WASTE
  // ==========================================

  // Waste Alerts: realWaste > 0 in production logs in last 7 days
  const recentWasteAlerts = useMemo(() => {
    return productionLogs
      .filter(log => {
        const logDate = new Date(log.date);
        return logDate >= sevenDaysAgo && (log.realWaste || 0) > 0;
      })
      .map(log => {
        const p = products.find(prod => prod.id === log.productId);
        return {
          id: log.id,
          date: log.date,
          productName: p?.name || "Produk",
          canal: log.canal,
          subLocation: log.subLocation,
          wasteQty: log.realWaste || 0
        };
      })
      .slice(0, 5); // Limit 5
  }, [productionLogs, products, sevenDaysAgo]);

  // ==========================================
  // 3. CHARTS DATA PREPARATION
  // ==========================================

  // Chart 1: Tren Penjualan PO Mingguan (Last 7 Days)
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

  // Chart 2: Arus Kas Harian (Last 7 Days)
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

  // Chart 3: Distribusi Stok Global (Gudang vs Stan)
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

  // ==========================================
  // 4. TOP PERFORMING RESELLERS/CHANNELS
  // ==========================================
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

  // ==========================================
  // 5. ACTIONABLE TABLES: PENDING POs & PICK-UP REMINDERS
  // ==========================================
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
          <p className="text-xs text-gray-500 mt-0.5">
            Metrik operasional terpusat Daifukumoy Management System.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-1.5 rounded-2xl border border-gray-100 shrink-0">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-bold text-gray-700">
            {format(new Date(), "EEEE, d MMMM yyyy", {})}
          </span>
        </div>
      </div>

      {/* Scorecards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Antrean PO */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Antrean PO</p>
            <h3 className="text-xl font-black text-gray-800 mt-0.5">{pendingPOCount} PO</h3>
            <p className="text-[9px] text-blue-500 font-semibold mt-0.5">Belum divalidasi</p>
          </div>
        </div>

        {/* Pendapatan PO Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Omset Hari Ini</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5 truncate">
              {formatCurrency(todayPORevenue)}
            </h3>
            <p className="text-[9px] text-green-500 font-semibold mt-0.5">{todayPOQty} pcs moci</p>
          </div>
        </div>

        {/* Pengeluaran Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pengeluaran Hari Ini</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5 truncate">
              {formatCurrency(todayExpenseAmount)}
            </h3>
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">Operasional hari ini</p>
          </div>
        </div>

        {/* Laba Bersih Hari Ini */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Laba Bersih Hari Ini</p>
            <h3 className={`text-lg font-black mt-0.5 truncate ${todayNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(todayNetProfit)}
            </h3>
            <p className="text-[9px] text-emerald-500 font-semibold mt-0.5">Omset - Pengeluaran</p>
          </div>
        </div>

        {/* Critical Materials count */}
        <div className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
            <Utensils size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bahan Kritis</p>
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
            <h3 className="text-base font-bold text-gray-800">Tren Penjualan Pre-Order</h3>
            <p className="text-xs text-gray-400">Total kuantitas penjemputan PO reseller dalam 7 hari terakhir</p>
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
            <h3 className="text-base font-bold text-gray-800">Jadwal Penjemputan PO</h3>
            <p className="text-xs text-gray-400">Live Pickup Logs hari ini</p>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[280px]">
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
            <h3 className="text-base font-bold text-gray-800">Arus Kas Harian (Mingguan)</h3>
            <p className="text-xs text-gray-400">Pemasukan vs Pengeluaran finansial harian</p>
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#FF65C5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Stock Donut Chart */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">Distribusi Stok Global</h3>
            <p className="text-xs text-gray-400">Sebaran moci di gudang pusat vs stan reseller</p>
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
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-gray-400">
                Belum ada data distribusi stok gudang / kirim cabang hari ini.
              </div>
            )}
          </div>
        </div>

        {/* Top Resellers Card */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-gray-800">Top 3 Reseller/Stan</h3>
              <p className="text-xs text-gray-400">Kanal paling aktif 7 hari terakhir</p>
            </div>
            <div className="space-y-2.5">
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
            <h3 className="text-base font-bold text-gray-800">Antrean PO Terbaru</h3>
            <p className="text-xs text-gray-400">5 pre-order masuk terbaru yang perlu divalidasi</p>
          </div>
          <Link
            href="/approval"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10"
          >
            Kelola Status <ChevronRight size={12} />
          </Link>
        </div>

        <div className="space-y-2.5">
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