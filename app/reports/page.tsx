"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  Printer, 
  Download,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO,
  eachMonthOfInterval,
  subMonths,
  startOfYear
} from "date-fns";
import { id } from "date-fns/locale";

export default function ReportsPage() {
  const { products, transactions, productionLogs, channels, locations } = useData();
  const { currentUser } = useAuth();

  // --- Filter State ---
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [insight, setInsight] = useState("");

  // Month & Year Options
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1];
  }, []);

  // --- Filter Logic (1 Year Retention) ---
  const filteredData = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(start);

    // Limit to 1 year ago (Data Retention)
    const oneYearAgo = startOfYear(subMonths(new Date(), 12));
    if (start < oneYearAgo) return { transactions: [], logs: [], periodStart: start, periodEnd: end };

    const monthTransactions = transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });

    const monthLogs = productionLogs.filter(l => {
      const d = parseISO(l.date);
      return isWithinInterval(d, { start, end });
    });

    return { 
      transactions: monthTransactions, 
      logs: monthLogs,
      periodStart: start,
      periodEnd: end
    };
  }, [selectedMonth, selectedYear, transactions, productionLogs]);

  // --- Calculations ---
  const stats = useMemo(() => {
    const { transactions: tList, logs: lList } = filteredData;

    const income = lList.reduce((acc, log) => {
      const product = products.find(p => p.id === log.productId);
      const price = log.priceSnapshot ?? (product?.price || 0);
      return acc + (log.soldQuantity * price);
    }, 0);

    const expense = tList.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);
    
    // Breakdown HPP (COGS vs Waste)
    let totalCogs = 0;
    let wasteCost = 0;
    let totalWasteUnits = 0;

    lList.forEach(log => {
      const product = products.find(p => p.id === log.productId);
      const hpp = log.hppSnapshot ?? (product?.hpp || 0);
      const sisa = Math.max(0, log.morningProduction - log.soldQuantity);
      
      totalCogs += log.soldQuantity * hpp;
      wasteCost += sisa * hpp;
      totalWasteUnits += sisa;
    });

    const variableCosts = totalCogs; // Pure COGS
    const totalExpense = expense + wasteCost + variableCosts; // Total biaya adalah operasional + waste + cogs
    const grossProfit = income - totalExpense;
    const zakat = grossProfit > 0 ? grossProfit * 0.025 : 0;
    const netProfit = grossProfit - zakat;

    // Income by Kanal (Dynamic)
    const canalStats: Record<string, { total: number, vol: number, subLocations: Record<string, { total: number, vol: number }> }> = {};
    
    channels.forEach(c => {
      canalStats[c.name] = { total: 0, vol: 0, subLocations: {} };
      if (c.hasSubLocation) {
        locations.filter(l => l.channelId === c.id).forEach(l => {
          canalStats[c.name].subLocations[l.name] = { total: 0, vol: 0 };
        });
      }
    });

    lList.forEach(log => {
      const product = products.find(p => p.id === log.productId);
      const price = log.priceSnapshot ?? (product?.price || 0);
      const totalAmount = log.soldQuantity * price;
      
      const canalName = log.canal || "Uncategorized";
      const locName = log.subLocation || "";

      if (canalStats[canalName]) {
        canalStats[canalName].total += totalAmount;
        canalStats[canalName].vol += log.soldQuantity;

        if (locName && canalStats[canalName].subLocations[locName] !== undefined) {
          canalStats[canalName].subLocations[locName].total += totalAmount;
          canalStats[canalName].subLocations[locName].vol += log.soldQuantity;
        }
      }
    });

    // Expenses Structure (from transactions)
    const gajiCosts = tList.filter(t => t.type === "expense" && t.category === "Gaji / Honor").reduce((acc, curr) => acc + curr.amount, 0);
    const sewaCosts = tList.filter(t => t.type === "expense" && t.category === "Sewa Tempat").reduce((acc, curr) => acc + curr.amount, 0);
    const opsCosts = tList.filter(t => t.type === "expense" && t.category === "Operasional").reduce((acc, curr) => acc + curr.amount, 0);
    const fixedCosts = gajiCosts + sewaCosts + opsCosts;

    // Hero Products
    const prodSales: Record<string, number> = {};
    lList.forEach(l => {
      prodSales[l.productId] = (prodSales[l.productId] || 0) + l.soldQuantity;
    });

    const heroProducts = Object.entries(prodSales)
      .map(([id, vol]) => ({
        name: products.find(p => p.id === id)?.name || id,
        vol,
        share: (vol / (lList.reduce((acc, curr) => acc + curr.soldQuantity, 0) || 1)) * 100
      }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 3);

    return {
      income,
      expense,
      wasteCost,
      totalExpense,
      grossProfit,
      zakat,
      netProfit,
      canalStats,
      variableCosts,
      gajiCosts,
      sewaCosts,
      opsCosts,
      fixedCosts,
      heroProducts,
      totalWasteUnits
    };
  }, [filteredData, products, channels, locations]);

  const handlePrint = () => {
    window.print();
  };

  if (currentUser?.role !== "owner" && currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500 font-quicksand">Akses khusus Owner dan Admin.</div>;
  }

  return (
    <div className="space-y-6 pb-20 mt-2 font-quicksand">
      
      {/* --- Filter Bar --- */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Bulan</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Tahun</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Printer size={18} />
          Cetak Laporan
        </button>
      </div>

      {/* --- REPORT CONTAINER --- */}
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none report-container">
        
        {/* Header Laporan */}
        <div className="p-8 pb-4 border-b border-primary/20 bg-slate-50/30 print:p-0 print:pb-2 print:border-b print:bg-transparent">
          <div className="flex items-center justify-between w-full relative z-10 print:gap-3">
            <img src="/logo.png" alt="Daifukumoy Logo" className="h-16 w-auto object-contain print:h-[40px]" />
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight print:text-[14pt] uppercase">LAPORAN KEUANGAN DAIFUKUMOY</h1>
              <p className="text-[#FF65C5] font-bold uppercase tracking-widest text-xs print:text-[9pt] print:tracking-normal">
                Periode: {format(filteredData.periodStart, "dd MMMM yyyy", { locale: id })} – {format(filteredData.periodEnd, "dd MMMM yyyy", { locale: id })}
              </p>
            </div>
            <img src="/logo.png" alt="Daifukumoy Logo" className="h-16 w-auto object-contain print:h-[40px]" />
          </div>
        </div>

        <div className="p-8 pt-6 space-y-8 print:p-0 print:space-y-4 print:pt-4">
          
          {/* Section I: Ringkasan Eksekutif */}
          <section className="print:space-y-2">
            <div className="flex items-center gap-2 mb-4 print:mb-1">
              <div className="w-1.5 h-4 bg-primary rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight print:text-[10pt]">I. Ringkasan Eksekutif</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div className="bg-white border border-slate-100 p-5 rounded-2xl print:p-2 print:border-slate-200">
                <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1 print:text-[7pt]">Pendapatan</p>
                <p className="text-xl font-bold text-gray-800 print:text-[11pt]">Rp {stats.income.toLocaleString()}</p>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl print:p-2 print:border-slate-200">
                <p className="text-[10px] font-bold text-red-500 uppercase mb-1 print:text-[7pt]">Pengeluaran</p>
                <p className="text-xl font-bold text-gray-800 print:text-[11pt]">Rp {stats.totalExpense.toLocaleString()}</p>
              </div>

              <div className="bg-white border border-slate-100 p-5 rounded-2xl print:p-2 print:border-slate-200">
                <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 print:text-[7pt]">Zakat (2.5%)</p>
                <p className="text-xl font-bold text-gray-800 print:text-[11pt]">Rp {stats.zakat.toLocaleString()}</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl print:p-2 print:bg-transparent print:border-primary">
                <p className="text-[10px] font-bold text-[#FF65C5] uppercase mb-1 print:text-[7pt]">Laba Bersih</p>
                <p className="text-xl font-bold text-[#FF65C5] print:text-[11pt]">Rp {stats.netProfit.toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* Section II: Rincian Pendapatan */}
          <section className="print:space-y-1">
            <div className="flex items-center gap-2 mb-4 print:mb-1">
              <div className="w-1.5 h-4 bg-primary rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight print:text-[10pt]">II. Pendapatan Per Kanal</h3>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 print:rounded-none">
              <table className="w-full text-left border-collapse text-sm print:text-[9pt] min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider print:p-1.5">Nama Kanal</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-center tracking-wider print:p-1.5">Volume</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-right tracking-wider print:p-1.5">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.canalStats).map(([canalName, cData]) => (
                    <React.Fragment key={canalName}>
                      <tr className="border-b border-slate-50">
                        <td className="p-4 font-bold text-slate-700 print:p-1.5 pl-4">{canalName}</td>
                        <td className="p-4 text-center text-slate-700 print:p-1.5">{cData.vol}</td>
                        <td className="p-4 text-right font-bold text-slate-700 print:p-1.5">Rp {cData.total.toLocaleString()}</td>
                      </tr>
                      {Object.entries(cData.subLocations).map(([subName, sData]) => (
                        <tr key={subName} className="bg-primary/[0.01]">
                          <td className="p-4 italic print:p-1.5 pl-10 border-b border-slate-50 text-slate-600">└ {subName}</td>
                          <td className="p-4 text-center print:p-1.5 border-b border-slate-50 text-slate-600">{sData.vol}</td>
                          <td className="p-4 text-right print:p-1.5 border-b border-slate-50 text-slate-600">Rp {sData.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="bg-slate-800 text-white print:bg-slate-100 print:text-slate-900 border-t-2 border-slate-800">
                    <td className="p-4 font-bold uppercase print:p-1.5 tracking-tight">TOTAL PENDAPATAN</td>
                    <td className="p-4 text-center font-bold print:p-1.5">{Object.values(stats.canalStats).reduce((acc, curr) => acc + curr.vol, 0)}</td>
                    <td className="p-4 text-right font-bold print:p-1.5">Rp {stats.income.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section III & IV Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
            {/* III: Biaya */}
            <section className="print:space-y-1">
              <div className="flex items-center gap-2 mb-4 print:mb-1">
                <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight print:text-[10pt]">III. Struktur Biaya</h3>
              </div>
              <div className="space-y-2 text-[11pt] font-quicksand font-normal text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>Biaya Variabel (COGS)</span>
                  <span>Rp {stats.variableCosts.toLocaleString()}</span>
                </div>
                
                <div className="pt-1">
                  <p className="mb-1 text-gray-800">Biaya Operasional:</p>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-slate-500 italic">
                      <span>└ Gaji / Honor</span>
                      <span>Rp {stats.gajiCosts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 italic">
                      <span>└ Sewa Tempat</span>
                      <span>Rp {stats.sewaCosts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 italic">
                      <span>└ Operasional Lainnya</span>
                      <span>Rp {stats.opsCosts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-50 text-red-500 mt-2">
                  <span>Biaya Waste ({stats.totalWasteUnits} unit)</span>
                  <span>Rp {stats.wasteCost.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* IV: Hero Products */}
            <section className="print:space-y-1">
              <div className="flex items-center gap-2 mb-4 print:mb-1">
                <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight print:text-[10pt]">IV. Hero Products</h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-sm print:text-[9pt] min-w-[300px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Nama Produk</th>
                      <th className="p-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Terjual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.heroProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="p-3 font-medium text-gray-700">{p.name}</td>
                        <td className="p-3 text-right font-bold text-primary">{p.vol} Pcs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Section V: Insight */}
          <section className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 print:p-3 print:rounded-lg print:bg-transparent print:border-slate-200">
            <h3 className="text-xs font-bold text-gray-800 uppercase mb-3 print:text-[9pt] print:mb-1">V. Insight & Rekomendasi</h3>
            <p className="text-xs text-slate-600 italic print:text-[9pt] min-h-[40px] leading-relaxed">
              {insight || "Tidak ada catatan tambahan untuk periode ini."}
            </p>
          </section>

          {/* Footer & Signature */}
          <div className="pt-6 flex justify-between items-end">
            <div className="hidden print:block opacity-30 grayscale">
               <img src="/logo.png" alt="mochi" className="h-10 w-auto" />
            </div>
            <div className="text-right space-y-10 print:space-y-6">
              <p className="text-[10px] text-slate-400 font-medium print:text-[7pt]">Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
              <div className="w-48 ml-auto border-t-2 border-slate-800 pt-3 text-center">
                <p className="text-sm font-bold text-gray-800 uppercase print:text-[9pt]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-normal print:text-[7pt]">Founder Daifukumoy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            font-size: 10pt !important;
            color: #1e293b !important;
          }
          /* Hide navigation and UI elements */
          aside, header, .print\\:hidden {
            display: none !important;
          }
          /* Remove UI effects from containers but keep them visible */
          .shadow-xl, .rounded-3xl, .report-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .report-container {
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
          }
          .animate-float {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

