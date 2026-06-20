"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { ArrowRightLeft, Package, Send, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { showSuccess, confirmAction, showError } from "../utils/alert";

export default function StockTransferPage() {
  const { products, locations, channels, stocks, addStockTransfer, stockTransfers } = useData();
  const { currentUser } = useAuth();

  const [transferForm, setTransferForm] = useState({
    productId: "",
    quantity: 1,
    locationId: ""
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const activeCategories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .filter(p => p.isActive)
          .map(p => p.category)
          .filter(Boolean)
      )
    ) as string[];
  }, [products]);

  const filteredProductsByCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(p => p.isActive && p.category === selectedCategory);
  }, [products, selectedCategory]);

  if (currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Admin.</div>;
  }

  // Calculate global stocks directly from 'stocks' state
  const selectedProductStock = useMemo(() => {
    if (!transferForm.productId) return 0;
    return stocks.find(s => s.productId === transferForm.productId)?.quantityActual || 0;
  }, [stocks, transferForm.productId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.productId || !transferForm.locationId || transferForm.quantity <= 0) return;

    if (transferForm.quantity > selectedProductStock) {
      showError("Stok Tidak Cukup!", `Di Gudang Pusat hanya tersedia ${selectedProductStock} pcs.`);
      return;
    }

    const product = products.find(p => p.id === transferForm.productId);
    
    let destName = "";
    if (transferForm.locationId.startsWith("loc-")) {
      const id = transferForm.locationId.replace("loc-", "");
      destName = locations.find(l => l.id === id)?.name || "";
    } else if (transferForm.locationId.startsWith("chan-")) {
      const id = transferForm.locationId.replace("chan-", "");
      destName = channels.find(c => c.id === id)?.name || "";
    } else {
      destName = locations.find(l => l.id === transferForm.locationId)?.name || "";
    }

    const confirmed = await confirmAction(
      "Kirim Stok?",
      `Kirim ${transferForm.quantity} pcs ${product?.name} ke ${destName}?`
    );

    if (confirmed) {
      try {
        await addStockTransfer({
          date: format(new Date(), "yyyy-MM-dd"),
          productId: transferForm.productId,
          quantity: transferForm.quantity,
          destination: destName
        });
        showSuccess("Transfer Berhasil!", "Stok telah berhasil dikirim ke lokasi tujuan.");
        setTransferForm({ ...transferForm, quantity: 1, productId: "", locationId: "" });
        setSelectedCategory("");
      } catch (err: any) {
        showError("Gagal Mengirim Stok", err.message);
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
          <ArrowRightLeft className="text-primary" size={32} /> Mutasi & Distribusi Stok
        </h2>
        <p className="text-gray-500 font-medium mt-1">Kirim produk dari Gudang Pusat ke Cabang/Stand.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-lg">Form Pengiriman Baru</h3>
        </div>
        <form onSubmit={handleTransfer} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Kategori</label>
                <select 
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setTransferForm(prev => ({ ...prev, productId: "", quantity: 1 }));
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium capitalize"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {activeCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Produk</label>
                <select 
                  required
                  disabled={!selectedCategory}
                  value={transferForm.productId}
                  onChange={e => setTransferForm({...transferForm, productId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedCategory ? "-- Pilih Produk --" : "-- Pilih Kategori Terlebih Dahulu --"}
                  </option>
                  {filteredProductsByCategory.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Sisa: {stocks.find(s => s.productId === p.id)?.quantityActual || 0} pcs)</option>
                  ))}
                </select>
              </div>

              {transferForm.productId && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <Package className="text-primary" size={24} />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Ketersediaan di Gudang:</p>
                    <p className="text-lg font-black text-primary">{selectedProductStock} Pcs</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Dikirim (Pcs)</label>
                <input 
                  type="number" 
                  min="1"
                  max={selectedProductStock || 1}
                  required
                  value={transferForm.quantity === 0 ? '' : transferForm.quantity}
                  onChange={e => setTransferForm({...transferForm, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium font-inter"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Tujuan</label>
                <select 
                  required
                  value={transferForm.locationId}
                  onChange={e => setTransferForm({...transferForm, locationId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                >
                  <option value="">-- Pilih Cabang/Kanal --</option>
                  <optgroup label="Stand / Lokasi">
                    {locations.filter(l => l.status === "active").map(l => (
                      <option key={`loc-${l.id}`} value={`loc-${l.id}`}>{l.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kanal Khusus">
                    {channels.filter(c => c.status === "active" && !c.hasSubLocation && c.name.toLowerCase() !== "reseller").map(c => (
                      <option key={`chan-${c.id}`} value={`chan-${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={!transferForm.productId || transferForm.quantity > selectedProductStock}
              className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} /> Kirim Stok
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="font-bold text-gray-800 text-lg mb-4">Riwayat Pengiriman Hari Ini</h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-montserrat text-sm">
                <th className="p-4 font-semibold">Produk</th>
                <th className="p-4 font-semibold text-right">Jumlah</th>
                <th className="p-4 font-semibold">Tujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stockTransfers.filter(t => t.date === format(new Date(), "yyyy-MM-dd")).map(transfer => {
                const product = products.find(p => p.id === transfer.productId);
                return (
                  <tr key={transfer.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="p-4 font-bold text-gray-800">{product?.name}</td>
                    <td className="p-4 text-right font-black text-primary">{transfer.quantity} Pcs</td>
                    <td className="p-4 text-gray-600 font-medium">{transfer.destination}</td>
                  </tr>
                );
              })}
              {stockTransfers.filter(t => t.date === format(new Date(), "yyyy-MM-dd")).length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Belum ada pengiriman stok hari ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
