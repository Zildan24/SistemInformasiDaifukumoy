"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useData } from "../context/DataContext";
import { Search, Save, PackageSearch, AlertTriangle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { confirmAction, showSuccess, showError } from "../utils/alert";

export default function OwnerInventory() {
  const { products, productionLogs, saveOpnamesBatch, channels, locations, stockTransfers, globalStockLogs } = useData();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGlobalStock, setShowGlobalStock] = useState(false);
  
  const [inputData, setInputData] = useState<Record<string, { sold: string, realWaste: string, reusableWaste: string }>>({});

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const activeLocations = locations.filter(l => l.channelId === selectedChannelId && l.status === "active");

  const canalName = selectedChannel?.name || "";
  const subLocationName = (selectedChannel?.hasSubLocation ? selectedLocation?.name : "") || "";
  const locationNameToMatch = subLocationName || canalName;

  // Calculate live assigned stock from transfers today
  const assignedStocks = useMemo(() => {
    const stocks: Record<string, number> = {};
    if (!locationNameToMatch) return stocks;

    stockTransfers.forEach(transfer => {
      if (transfer.date === todayStr && transfer.destination === locationNameToMatch) {
        stocks[transfer.productId] = (stocks[transfer.productId] || 0) + transfer.quantity;
      }
    });
    return stocks;
  }, [stockTransfers, todayStr, locationNameToMatch]);

  // Calculate global stocks for "Cek Gudang"
  const globalStocks = useMemo(() => {
    const stocks: Record<string, number> = {};
    products.forEach(p => stocks[p.id] = 0);
    globalStockLogs.forEach(log => {
      if (stocks[log.productId] !== undefined) {
        if (log.type === "in") stocks[log.productId] += log.quantity;
        else if (log.type === "out") stocks[log.productId] -= log.quantity;
      }
    });
    return stocks;
  }, [globalStockLogs, products]);

  // Initialize input data from existing logs if opname was already done partially
  useEffect(() => {
    if (!selectedChannelId) return;

    const initialData: Record<string, { sold: string, realWaste: string, reusableWaste: string }> = {};
    products.forEach(p => {
      const log = productionLogs.find(l => 
        l.productId === p.id && 
        l.date === todayStr && 
        l.canal === canalName && 
        (selectedChannel?.hasSubLocation ? l.subLocation === subLocationName : true)
      );
      initialData[p.id] = {
        sold: log?.soldQuantity.toString() || "",
        realWaste: log?.realWaste?.toString() || "",
        reusableWaste: log?.reusableWaste?.toString() || ""
      };
    });
    setInputData(initialData);
  }, [products, productionLogs, todayStr, selectedChannelId, selectedLocationId, selectedChannel, canalName, subLocationName]);

  const handleInputChange = (productId: string, field: "sold" | "realWaste" | "reusableWaste", value: string) => {
    setInputData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleBulkSave = async () => {
    if (!selectedChannelId || (selectedChannel?.hasSubLocation && !selectedLocationId)) {
      alert("Pilih kanal dan lokasi terlebih dahulu!");
      return;
    }

    // Validation
    let hasError = false;
    Object.keys(inputData).forEach(productId => {
      const data = inputData[productId];
      const assigned = assignedStocks[productId] || 0;
      if (assigned > 0 || data.sold !== "") {
        const sold = parseInt(data.sold) || 0;
        const sisa = assigned - sold;
        const real = parseInt(data.realWaste) || 0;
        const reusable = parseInt(data.reusableWaste) || 0;

        if (sisa > 0 && (real + reusable !== sisa)) {
          showError("Data Tidak Valid!", `Sisa stok produk ${products.find(p=>p.id===productId)?.name} adalah ${sisa}, namun pembagian Real Waste & Reusable Waste tidak sama dengan sisa.`);
          hasError = true;
        }
        if (sold > assigned) {
          showError("Data Tidak Valid!", `Produk terjual (${sold}) melebihi stok yang ada (${assigned}).`);
          hasError = true;
        }
      }
    });

    if (hasError) return;

    const isConfirmed = await confirmAction(
      "Simpan Opname Akhir Hari?",
      `Data akan dikunci. Real Waste akan dicatat sebagai kerugian, dan Reusable Waste akan diretur ke Gudang Pusat.`
    );

    if (isConfirmed) {
      try {
        const batchData = [];

        for (const productId of Object.keys(inputData)) {
          const data = inputData[productId];
          const assigned = assignedStocks[productId] || 0;
          
          if (assigned > 0 || data.sold !== "") {
            const sold = parseInt(data.sold) || 0;
            const real = parseInt(data.realWaste) || 0;
            const reusable = parseInt(data.reusableWaste) || 0;
            
            const logId = productionLogs.find(l => 
              l.productId === productId && 
              l.date === todayStr && 
              l.canal === canalName && 
              l.subLocation === subLocationName
            )?.id;

            batchData.push({
               logId, date: todayStr, productId, canal: canalName, subLocation: subLocationName, sold, realWaste: real, reusableWaste: reusable, assigned
            });
          }
        }
        
        await saveOpnamesBatch(batchData);
        showSuccess("Tutup Buku Berhasil!", `Telah menyimpan opname untuk ${batchData.length} produk beserta pendataan otomatis omzet.`);
      } catch (err: any) {
        showError("Gagal Tutup Buku", err.message);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // Only show products that have assigned stock OR have input data already
    return result.filter(p => (assignedStocks[p.id] || 0) > 0 || (inputData[p.id]?.sold && parseInt(inputData[p.id].sold) > 0));
  }, [products, searchQuery, assignedStocks, inputData]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-quicksand">
      
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden mx-2 sm:mx-0 mt-2">
        
        {/* Header & Canal Selection */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-gray-800">Opname (Tutup Buku): {todayStr}</h3>
            <div className="flex flex-wrap gap-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
              {channels.filter(c => c.status === "active").map(canal => (
                <button
                  key={canal.id}
                  onClick={() => {
                    setSelectedChannelId(canal.id);
                    setSelectedLocationId("");
                  }}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${selectedChannelId === canal.id ? "bg-primary text-white shadow-md shadow-primary/30" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  {canal.name}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Sub-location */}
          {selectedChannel?.hasSubLocation && (
            <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-bold text-gray-600">Pilih Lokasi {selectedChannel.name}:</label>
              <select 
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Pilih Lokasi --</option>
                {activeLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Table */}
        {(!selectedChannelId || (selectedChannel?.hasSubLocation && !selectedLocationId)) ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <img 
                src="/happy1.png" 
                alt="Mochi Mascot" 
                className="w-32 h-32 object-contain animate-float"
              />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-800 tracking-tight">Pilih Lokasi Opname</h4>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Tentukan lokasi stand/kanal untuk melakukan rekonsiliasi akhir hari.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row justify-between gap-4">
              <button 
                onClick={() => setShowGlobalStock(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors text-sm"
              >
                <PackageSearch size={18} /> Cek Stok Gudang
              </button>
              
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" placeholder="Cari varian produk..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              {filteredProducts.length === 0 ? (
                <div className="p-10 text-center text-gray-500 font-medium">
                  Belum ada produk yang ditransfer ke lokasi ini hari ini.
                </div>
              ) : (
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100 font-black tracking-widest">
                    <tr>
                      <th scope="col" className="px-4 py-5">Nama Produk</th>
                      <th scope="col" className="px-4 py-5 text-center bg-blue-50/50">Stok Live</th>
                      <th scope="col" className="px-4 py-5 text-center">Terjual</th>
                      <th scope="col" className="px-4 py-5 text-center">Sisa</th>
                      <th scope="col" className="px-4 py-5 text-center w-64">Pembagian Sisa (Waste)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const assigned = assignedStocks[product.id] || 0;
                      const sold = parseInt(inputData[product.id]?.sold || "0");
                      const sisa = assigned - sold;
                      
                      return (
                        <tr key={product.id} className="bg-white border-b border-gray-50 hover:bg-primary/5 transition-colors group font-quicksand">
                          <td className="px-4 py-5 font-bold text-gray-700 text-sm">{product.name}</td>
                          <td className="px-4 py-3 text-center bg-blue-50/30">
                            <span className="text-base font-black text-blue-600">{assigned}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="number" min="0" max={assigned} value={inputData[product.id]?.sold || ""} 
                              onChange={e => handleInputChange(product.id, "sold", e.target.value)}
                              className="w-20 px-2 py-2 border border-gray-200 rounded-xl text-center font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all text-base"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-base font-black ${sisa > 0 ? "text-orange-500" : sisa < 0 ? "text-red-500" : "text-gray-400"}`}>
                              {sisa}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {sisa > 0 ? (
                              <div className="flex flex-col gap-2 p-2 bg-orange-50/50 rounded-xl border border-orange-100">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={12}/> Basi/Loss</label>
                                  <input 
                                    type="number" min="0" value={inputData[product.id]?.realWaste || ""} 
                                    onChange={e => handleInputChange(product.id, "realWaste", e.target.value)}
                                    className="w-16 px-2 py-1 border border-red-200 rounded-lg text-center font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-xs font-bold text-green-600 flex items-center gap-1"><RefreshCcw size={12}/> Retur</label>
                                  <input 
                                    type="number" min="0" value={inputData[product.id]?.reusableWaste || ""} 
                                    onChange={e => handleInputChange(product.id, "reusableWaste", e.target.value)}
                                    className="w-16 px-2 py-1 border border-green-200 rounded-lg text-center font-bold text-green-600 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-gray-400 font-medium italic">Tidak ada sisa</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {selectedChannel?.name.toLowerCase() !== "reseller" && (
              <div className="p-8 bg-gray-50/80 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleBulkSave}
                  className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-transform transform hover:scale-[1.02] shadow-xl shadow-primary/30 w-full sm:w-auto"
                >
                  <Save size={24} /> Simpan Opname Akhir Hari
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Global Stock Modal */}
      {showGlobalStock && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PackageSearch size={18} className="text-blue-600"/> Live Stok Gudang
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {products.filter(p => p.isActive).map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-700 text-sm">{p.name}</span>
                    <span className="font-black text-blue-600">{globalStocks[p.id] || 0} pcs</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowGlobalStock(false)} className="w-full py-3 bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
