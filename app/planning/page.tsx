"use client";


import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { ClipboardList, BrainCircuit, Wand2, ArrowRight, PackageOpen } from "lucide-react";
import { addDays, format } from "date-fns";
import { confirmAction, showSuccess } from "../utils/alert";

export default function PlanningPage() {
  const { products, productionLogs, globalStockLogs, channels, locations, saveProductionPlans, preOrders } = useData();
  const { currentUser } = useAuth();

  const [selectedCanal, setSelectedCanal] = useState<string>("Semua");
  const [selectedSubLocation, setSelectedSubLocation] = useState<string>("");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Protect route
  if (currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Admin.</div>;
  }

  const tomorrow = addDays(new Date(), 1);
  const tomorrowDayOfWeek = tomorrow.getDay();
  const hariIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const namaHariBesok = hariIndo[tomorrowDayOfWeek];

  // --- Core Calculation Logic ---
  const calculateRecommendation = (productId: string, canal: string, subLocation?: string) => {
    const productLogs = productionLogs.filter(l => 
      l.productId === productId && 
      l.canal === canal &&
      (subLocation ? l.subLocation === subLocation : true)
    );

    // Hitung tanggal 1 minggu lalu, 2 minggu lalu, dan 3 minggu lalu pada hari yang sama
    const date1 = format(addDays(tomorrow, -7), "yyyy-MM-dd");
    const date2 = format(addDays(tomorrow, -14), "yyyy-MM-dd");
    const date3 = format(addDays(tomorrow, -21), "yyyy-MM-dd");

    const log1 = productLogs.find(l => l.date === date1);
    const log2 = productLogs.find(l => l.date === date2);
    const log3 = productLogs.find(l => l.date === date3);

    const sold1 = log1 ? log1.soldQuantity : 0;
    const sold2 = log2 ? log2.soldQuantity : 0;
    const sold3 = log3 ? log3.soldQuantity : 0;

    // Simple Moving Average (SMA) dari 3 minggu terakhir pada hari yang sama
    const average = (sold1 + sold2 + sold3) / 3;

    return {
      average: Math.ceil(average),
      recommendation: Math.ceil(average),
      trendPct: 0
    };
  };

  // --- Algoritma Heuristik (Day-of-the-Week & SMA) ---
  const predictions = useMemo(() => {
    const results: Record<string, { average: number, recommendation: number, trendPct: number }> = {};
    const activeChannels = channels.filter(c => c.status === "active");

    if (selectedCanal === "Semua") {
      products.forEach(p => {
        let totalAvg = 0;
        let totalRec = 0;
        
        // Hanya hitung rekomendasi dari kanal Stand
        const standChannels = activeChannels.filter(c => c.name.toLowerCase() === "stand");
        
        standChannels.forEach(c => {
          if (c.hasSubLocation) {
            const locs = locations.filter(l => l.channelId === c.id && l.status === "active");
            locs.forEach(loc => {
              const pred = calculateRecommendation(p.id, c.name, loc.name);
              totalAvg += pred.average;
              totalRec += pred.recommendation;
            });
          } else {
            const pred = calculateRecommendation(p.id, c.name);
            totalAvg += pred.average;
            totalRec += pred.recommendation;
          }
        });

        results[p.id] = { average: totalAvg, recommendation: totalRec, trendPct: 0 };
      });
      return results;
    }

    // Jika bukan kanal Stand (misal Reseller), rekomendasi bernilai 0
    if (selectedCanal.toLowerCase() !== "stand") {
      return {};
    }

    const channelObj = channels.find(c => c.name === selectedCanal);
    if (!channelObj || (channelObj.hasSubLocation && !selectedSubLocation)) return {};

    products.forEach(p => {
      results[p.id] = calculateRecommendation(p.id, selectedCanal, selectedSubLocation);
    });

    return results;
  }, [products, productionLogs, tomorrow, selectedCanal, selectedSubLocation, channels, locations]);

  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  
  const resellerTargets = useMemo(() => {
    if (selectedCanal !== "Reseller") return {};
    
    const rt: Record<string, number> = {};
    preOrders.forEach(po => {
      // Hanya hitung PO yang tanggal ambilnya = target date (besok) dan bukan berstatus 'menunggu pembayaran'
      if (po.pickupDate === tomorrowStr && po.status !== 'menunggu pembayaran' && po.status !== 'gagal') {
        rt[po.productId] = (rt[po.productId] || 0) + po.quantity;
      }
    });
    return rt;
  }, [preOrders, tomorrowStr, selectedCanal]);
  
  const reusableWasteMap = useMemo(() => {
    const map: Record<string, number> = {};
    const todayStr = format(new Date(), "yyyy-MM-dd");

    productionLogs.forEach(log => {
      if (log.date === todayStr && log.reusableWaste) {
        // Jika sedang memilih lokasi spesifik, ambil waste dari lokasi tersebut saja
        if (selectedCanal !== "Semua") {
          const channelObj = channels.find(c => c.name === selectedCanal);
          if (log.canal !== selectedCanal) return;
          if (channelObj?.hasSubLocation && log.subLocation !== selectedSubLocation) return;
        }
        map[log.productId] = (map[log.productId] || 0) + log.reusableWaste;
      }
    });

    return map;
  }, [productionLogs, selectedCanal, selectedSubLocation, channels]);

  const handleApplyRecommendations = async () => {
    const isConfirmed = await confirmAction(
      "Gunakan Semua Rekomendasi?",
      "Ini akan menimpa seluruh input target yang sudah Anda ketik sebelumnya."
    );

    if (isConfirmed) {
      const newTargets: Record<string, number> = {};
      Object.keys(predictions).forEach(pid => {
        const originalRec = predictions[pid].recommendation;
        const availableReusable = reusableWasteMap[pid] || 0;
        const finalRec = Math.max(0, originalRec - availableReusable);
        newTargets[pid] = finalRec;
      });
      setTargets(newTargets);
      showSuccess("Saran Diterapkan!", "Target produksi telah diisi otomatis berdasarkan pola algoritma.");
    }
  };

  const handleTargetChange = (productId: string, val: string) => {
    setTargets(prev => ({
      ...prev,
      [productId]: val === '' ? ('' as any) : parseInt(val) || 0
    }));
  };

  const handleFinalizePlanning = async () => {
    if (selectedCanal === "Semua") return;
    
    setIsSaving(true);
    try {
      const channelObj = channels.find(c => c.name === selectedCanal);
      const locationObj = channelObj?.hasSubLocation ? locations.find(l => l.name === selectedSubLocation) : null;
      
      if (!channelObj) {
        alert("Kanal tidak ditemukan. Silakan tambahkan kanal di pengaturan.");
        return;
      }

      if (channelObj.hasSubLocation && !locationObj) {
        alert("Lokasi valid tidak ditemukan.");
        return;
      }

      const plans: any[] = [];
      products.forEach(p => {
        const data = predictions[p.id];
        let finalTarget = 0;
        
        if (selectedCanal === "Reseller") {
          finalTarget = resellerTargets[p.id] || 0;
        } else {
          const targetVal = targets[p.id];
          finalTarget = targetVal !== undefined && targetVal !== ('' as any) ? Number(targetVal) : (data?.recommendation || 0);
        }

        plans.push({
          target_date: tomorrowStr,
          product_id: p.id,
          channel_id: channelObj.id,
          location_id: locationObj ? locationObj.id : null,
          avg_past_week_qty: data?.average || 0,
          target_production_qty: finalTarget,
          is_finalized: true
        });
      });

      await saveProductionPlans(plans);
      showSuccess("Target Disimpan!", `Perencanaan produksi untuk ${selectedSubLocation || selectedCanal} berhasil disimpan ke database.`);
    } catch(err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 mt-2">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden mt-4">
        
        {/* Header & Location Selection */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Perencanaan Produksi</h3>
              <p className="text-xs text-gray-500 font-medium">Target produksi untuk besok ({namaHariBesok})</p>
            </div>
            <div className="flex gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setSelectedCanal("Semua");
                  setSelectedSubLocation("");
                }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCanal === "Semua" ? "bg-primary text-white shadow-md shadow-primary/30" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Semua
              </button>
              {channels.filter(c => c.status === "active").map(canal => (
                <button
                  key={canal.id}
                  onClick={() => {
                    setSelectedCanal(canal.name);
                    setSelectedSubLocation("");
                    setTargets({});
                  }}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedCanal === canal.name ? "bg-primary text-white shadow-md shadow-primary/30" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {canal.name}
                </button>
              ))}
            </div>
          </div>

          {channels.find(c => c.name === selectedCanal)?.hasSubLocation && (
            <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-bold text-gray-600">Pilih Lokasi:</label>
              <select 
                value={selectedSubLocation}
                onChange={(e) => setSelectedSubLocation(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Pilih Lokasi --</option>
                {locations.filter(l => l.channelId === channels.find(c => c.name === selectedCanal)?.id && l.status === "active").map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {selectedCanal !== "Semua" && (!channels.find(c => c.name === selectedCanal) || (channels.find(c => c.name === selectedCanal)?.hasSubLocation && !selectedSubLocation)) ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <img 
                src="/kanal.png" 
                alt="Kanal Mascot" 
                className="w-48 h-48 object-contain animate-float"
              />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-800">Tentukan Lokasi Perencanaan</h4>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Sistem akan menghitung rekomendasi stok berdasarkan riwayat penjualan di lokasi yang Anda pilih.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3 px-6 bg-white">
               <span className="text-sm font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 flex items-center gap-2 self-start">
                 <PackageOpen size={16} /> 
                 {selectedCanal === "Semua" ? "Akumulasi Seluruh Kanal" : `Data Riwayat: ${selectedSubLocation || selectedCanal}`}
               </span>
               {selectedCanal !== "Semua" && selectedCanal !== "Reseller" && (
                 <button 
                  onClick={handleApplyRecommendations}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform transform hover:scale-[1.02] shadow-lg shadow-primary/30 w-full sm:w-auto"
                >
                  <Wand2 size={18} /> Terapkan Saran Sistem
                </button>
               )}
            </div>
              
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 min-w-[600px]">
                <thead className="text-xs text-gray-600 uppercase bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-5 font-bold tracking-wider">Varian Produk</th>
                    {selectedCanal !== "Reseller" && (
                      <>
                        <th scope="col" className="px-6 py-5 font-bold tracking-wider text-center">Avg Hari</th>
                        {selectedCanal !== "Semua" && (
                          <th scope="col" className="px-6 py-5 font-bold tracking-wider text-center text-pink-500">Reusable Waste</th>
                        )}
                        <th scope="col" className="px-6 py-5 font-bold tracking-wider text-center text-primary">
                          {selectedCanal === "Semua" ? "Total Target Produksi" : "Rekomendasi"}
                        </th>
                      </>
                    )}
                    {selectedCanal !== "Semua" && (
                      <th scope="col" className="px-6 py-5 font-bold tracking-wider text-center">Target (Pcs)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const data = predictions[p.id];
                    const targetVal = targets[p.id] !== undefined ? targets[p.id].toString() : "";
                    const availableReusable = reusableWasteMap[p.id] || 0;
                    const rekomendasiBaru = Math.max(0, (data?.recommendation || 0) - availableReusable);

                    return (
                      <tr key={p.id} className="bg-white border-b border-gray-50 hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-5 font-bold text-gray-800 text-base">{p.name}</td>
                        {selectedCanal !== "Reseller" && (
                          <>
                            <td className="px-6 py-5 text-center font-medium text-gray-600">{data?.average || 0}</td>
                            
                            {selectedCanal !== "Semua" && (
                              <td className="px-6 py-5 text-center font-bold text-pink-500">{availableReusable}</td>
                            )}

                            <td className="px-6 py-5 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-base font-bold text-primary">
                                  {selectedCanal === "Semua" ? (data?.recommendation || 0) : rekomendasiBaru}
                                </span>
                                {data?.trendPct !== undefined && data.trendPct !== 0 && (
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold mt-1 ${data.trendPct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                    {data.trendPct > 0 ? '+' : ''}{data.trendPct}% Trend
                                  </span>
                                )}
                              </div>
                            </td>
                          </>
                        )}

                        {selectedCanal !== "Semua" && (
                          <td className="px-6 py-4 w-40">
                            <input 
                              type="number" 
                              value={selectedCanal === "Reseller" ? (resellerTargets[p.id] || 0) : targetVal} 
                              onChange={e => {
                                if (selectedCanal !== "Reseller") {
                                  handleTargetChange(p.id, e.target.value);
                                }
                              }}
                              readOnly={selectedCanal === "Reseller"}
                              className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base outline-none text-center font-bold transition-all shadow-sm ${selectedCanal === "Reseller" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "focus:ring-4 focus:ring-primary/20 focus:border-primary text-gray-800"}`} 
                              placeholder="0"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedCanal !== "Semua" && selectedCanal !== "Reseller" && (
              <div className="p-8 bg-gray-50/80 border-t border-gray-100 flex justify-end">
                <button 
                  className={`bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-transform transform hover:scale-[1.02] shadow-xl shadow-primary/30 w-full sm:w-auto ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={handleFinalizePlanning}
                  disabled={isSaving}
                >
                  <ArrowRight size={24} className={isSaving ? "animate-pulse" : ""} /> 
                  {isSaving ? "Menyimpan..." : "Finalisasi Perencanaan"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
