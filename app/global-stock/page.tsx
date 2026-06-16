"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { Package, Plus, History, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { showSuccess, confirmAction } from "../utils/alert";

export default function GlobalStockPage() {
  const { products, stocks, globalStockLogs, addGlobalStockLog } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"stok" | "log">("stok");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ productId: "", quantity: 1, description: "Hasil Produksi Dapur" });

  if (currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Admin.</div>;
  }

  // Calculate current global stock per product using 'stocks' directly
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const globalStocks = useMemo(() => {
    const stocksMap: Record<string, number> = {};
    products.forEach(p => stocksMap[p.id] = 0);
    stocks.forEach(s => stocksMap[s.productId] = s.quantityActual);
    return stocksMap;
  }, [stocks, products]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.productId || addForm.quantity <= 0) return;

    const product = products.find(p => p.id === addForm.productId);
    const confirmed = await confirmAction(
      "Tambah Stok Produksi?",
      `Tambahkan ${addForm.quantity} pcs ${product?.name} ke Gudang Pusat?`
    );

    if (confirmed) {
      try {
        await addGlobalStockLog({
          date: format(new Date(), "yyyy-MM-dd"),
          productId: addForm.productId,
          type: "in",
          quantity: addForm.quantity,
          description: addForm.description
        });
        showSuccess("Stok Ditambahkan!", "Stok Gudang Pusat berhasil diperbarui.");
        setIsAddModalOpen(false);
        setAddForm({ productId: "", quantity: 1, description: "Hasil Produksi Dapur" });
      } catch (err: any) {
        showError("Gagal Menambah Stok", err.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
            <Package className="text-primary" size={32} /> Stok Global (Gudang)
          </h2>
          <p className="text-gray-500 font-medium mt-1">Stok Siap Jual per Hari Ini: <span className="font-bold text-gray-800">{todayStr}</span></p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={20} /> Tambah Produksi Dapur
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab("stok")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === "stok" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Sisa Stok Saat Ini
        </button>
        <button 
          onClick={() => setActiveTab("log")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === "log" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <History size={16} /> Riwayat Aktivitas
        </button>
      </div>

      {activeTab === "stok" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-montserrat text-sm">
                <th className="p-4 font-semibold">Produk</th>
                <th className="p-4 font-semibold">Kategori</th>
                <th className="p-4 font-semibold text-right">Stok Gudang (Pcs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(product => {
                const stock = globalStocks[product.id] || 0;
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.description.substring(0, 40)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{product.category || "Umum"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-lg font-black ${stock > 20 ? 'text-green-600' : stock > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {stock}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "log" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-montserrat text-sm">
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Produk</th>
                <th className="p-4 font-semibold text-center">Tipe</th>
                <th className="p-4 font-semibold text-right">Jumlah</th>
                <th className="p-4 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {globalStockLogs.map(log => {
                const product = products.find(p => p.id === log.productId);
                const isIn = log.type === "in";
                const isPending = log.date > todayStr;
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="p-4 text-gray-500 font-medium flex items-center gap-2">
                      {log.date}
                      {isPending && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">BESOK / PENDING</span>}
                    </td>
                    <td className="p-4 font-bold text-gray-800">{product?.name}</td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center justify-center p-1.5 rounded-lg ${isIn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isIn ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-black ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                      {isIn ? '+' : '-'}{log.quantity}
                    </td>
                    <td className="p-4 text-gray-600">{log.description}</td>
                  </tr>
                );
              })}
              {globalStockLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Belum ada riwayat aktivitas gudang.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Plus size={20} className="text-primary"/> Tambah Stok Produksi
              </h3>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Produk</label>
                <select 
                  required
                  value={addForm.productId}
                  onChange={e => setAddForm({...addForm, productId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.filter(p => p.isActive).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah (Pcs)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={addForm.quantity === 0 ? '' : addForm.quantity}
                  onChange={e => setAddForm({...addForm, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium font-inter"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Keterangan</label>
                <input 
                  type="text" 
                  required
                  value={addForm.description}
                  onChange={e => setAddForm({...addForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-md shadow-primary/20 transition-transform active:scale-95">Simpan Stok</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
