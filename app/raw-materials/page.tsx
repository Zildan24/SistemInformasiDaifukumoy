"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { Box, Plus, History, ArrowDownToLine, ArrowUpFromLine, AlertCircle, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { showSuccess, confirmAction, showError } from "../utils/alert";

export default function RawMaterialsPage() {
  const { rawMaterials, rawMaterialLogs, addRawMaterial, updateRawMaterial, deleteRawMaterial, addRawMaterialLog } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"stok" | "log">("stok");
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  
  // Forms
  const [materialForm, setMaterialForm] = useState({ id: "", name: "", unit: "kg", minStock: 10 });
  const [mutasiForm, setMutasiForm] = useState({ rawMaterialId: "", type: "in" as "in" | "out", quantity: 1, description: "" });

  if (currentUser?.role !== "admin") {
    return <div className="p-6 text-center text-gray-500">Akses khusus Admin.</div>;
  }

  // Calculate current stock per raw material
  const currentStocks = useMemo(() => {
    const stocks: Record<string, number> = {};
    rawMaterials.forEach(rm => stocks[rm.id] = rm.currentStock);
    return stocks;
  }, [rawMaterials]);

  // Handlers for Raw Material CRUD
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name || materialForm.minStock < 0) return;

    try {
      if (isEditModalOpen) {
        await updateRawMaterial(materialForm.id, { name: materialForm.name, unit: materialForm.unit, minStock: materialForm.minStock });
        showSuccess("Tersimpan!", "Bahan baku berhasil diperbarui.");
        setIsEditModalOpen(false);
      } else {
        await addRawMaterial({ name: materialForm.name, unit: materialForm.unit, minStock: materialForm.minStock, currentStock: 0 });
        showSuccess("Ditambahkan!", "Bahan baku baru berhasil ditambahkan.");
        setIsAddModalOpen(false);
      }
      setMaterialForm({ id: "", name: "", unit: "kg", minStock: 10 });
    } catch (err: any) {
      showError("Gagal Menyimpan", err.message);
    }
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    const isConfirmed = await confirmAction("Hapus Bahan Baku?", `Apakah Anda yakin ingin menghapus ${name}?`);
    if (isConfirmed) {
      try {
        await deleteRawMaterial(id);
        showSuccess("Terhapus", "Bahan baku telah dihapus.");
      } catch (err: any) {
        showError("Gagal Menghapus", err.message);
      }
    }
  };

  const openEdit = (rm: any) => {
    setMaterialForm(rm);
    setIsEditModalOpen(true);
  };

  // Handler for Mutasi
  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiForm.rawMaterialId || mutasiForm.quantity <= 0) return;

    const stock = currentStocks[mutasiForm.rawMaterialId] || 0;
    if (mutasiForm.type === "out" && mutasiForm.quantity > stock) {
      showError("Stok Tidak Cukup!", `Hanya tersedia ${stock} ${rawMaterials.find(rm => rm.id === mutasiForm.rawMaterialId)?.unit} di gudang.`);
      return;
    }

    try {
      await addRawMaterialLog({
        date: format(new Date(), "yyyy-MM-dd"),
        rawMaterialId: mutasiForm.rawMaterialId,
        type: mutasiForm.type,
        quantity: mutasiForm.quantity,
        description: mutasiForm.description || (mutasiForm.type === "in" ? "Pembelian/Stok Masuk" : "Pemakaian Produksi")
      });
      
      showSuccess("Berhasil!", `Stok bahan baku berhasil di${mutasiForm.type === "in" ? "tambah" : "kurangi"}.`);
      setIsMutasiModalOpen(false);
      setMutasiForm({ rawMaterialId: "", type: "in", quantity: 1, description: "" });
    } catch (err: any) {
      showError("Gagal Menyimpan Mutasi", err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
            <Box className="text-primary" size={32} /> Bahan Baku
          </h2>
          <p className="text-gray-500 font-medium mt-1">Kelola stok inventaris bahan baku dapur.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setMutasiForm({...mutasiForm, type: "out"}); setIsMutasiModalOpen(true); }}
            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-transform active:scale-95 text-sm"
          >
            <ArrowUpFromLine size={18} /> Lapor Pemakaian
          </button>
          <button 
            onClick={() => { setMutasiForm({...mutasiForm, type: "in"}); setIsMutasiModalOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95 text-sm"
          >
            <ArrowDownToLine size={18} /> Barang Masuk
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab("stok")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === "stok" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Sisa Stok
        </button>
        <button 
          onClick={() => setActiveTab("log")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === "log" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          <History size={16} /> Riwayat Mutasi
        </button>
      </div>

      {activeTab === "stok" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-end">
            <button 
              onClick={() => { setMaterialForm({ id: "", name: "", unit: "kg", minStock: 10 }); setIsAddModalOpen(true); }}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm"
            >
              <Plus size={16} /> Tambah Item Baru
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-montserrat text-sm">
                  <th className="p-4 font-semibold">Nama Bahan Baku</th>
                  <th className="p-4 font-semibold text-center">Batas Aman</th>
                  <th className="p-4 font-semibold text-right">Sisa Stok</th>
                  <th className="p-4 font-semibold text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rawMaterials.map(rm => {
                  const stock = currentStocks[rm.id] || 0;
                  const isLow = stock <= rm.minStock;
                  return (
                    <tr key={rm.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{rm.name}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-gray-500 font-medium text-sm">{rm.minStock} {rm.unit}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLow && <AlertCircle size={16} className="text-red-500 animate-pulse" />}
                          <span className={`text-lg font-black ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                            {stock} <span className="text-sm font-bold text-gray-400">{rm.unit}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(rm)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteMaterial(rm.id, rm.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rawMaterials.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">Belum ada data bahan baku.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "log" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-montserrat text-sm">
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Bahan Baku</th>
                  <th className="p-4 font-semibold text-center">Tipe</th>
                  <th className="p-4 font-semibold text-right">Jumlah</th>
                  <th className="p-4 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rawMaterialLogs.map(log => {
                  const rm = rawMaterials.find(r => r.id === log.rawMaterialId);
                  const isIn = log.type === "in";
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                      <td className="p-4 text-gray-500 font-medium">{log.date}</td>
                      <td className="p-4 font-bold text-gray-800">{rm?.name}</td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-lg ${isIn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {isIn ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-black ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                        {isIn ? '+' : '-'}{log.quantity} <span className="text-xs font-bold text-gray-400">{rm?.unit}</span>
                      </td>
                      <td className="p-4 text-gray-600">{log.description}</td>
                    </tr>
                  );
                })}
                {rawMaterialLogs.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada riwayat mutasi bahan baku.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Box size={20} className="text-gray-500"/> {isEditModalOpen ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
              </h3>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Bahan</label>
                <input 
                  type="text" required value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Satuan</label>
                  <select 
                    value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                  >
                    <option value="kg">Kilogram (Kg)</option>
                    <option value="gr">Gram (gr)</option>
                    <option value="liter">Liter (L)</option>
                    <option value="ml">Mililiter (ml)</option>
                    <option value="pcs">Pcs</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batas Minimum</label>
                  <input 
                    type="number" min="0" required value={materialForm.minStock === 0 ? '' : materialForm.minStock} onChange={e => setMaterialForm({...materialForm, minStock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium font-inter"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 shadow-md transition-transform active:scale-95">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mutasi Modal */}
      {isMutasiModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 border-b border-gray-100 bg-gray-50/50 border-t-4 ${mutasiForm.type === 'in' ? 'border-t-green-500' : 'border-t-red-500'}`}>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                {mutasiForm.type === 'in' ? <ArrowDownToLine size={20} className="text-green-500"/> : <ArrowUpFromLine size={20} className="text-red-500"/>} 
                {mutasiForm.type === 'in' ? "Input Barang Masuk" : "Lapor Pemakaian"}
              </h3>
            </div>
            <form onSubmit={handleMutasi} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bahan Baku</label>
                <select 
                  required value={mutasiForm.rawMaterialId} onChange={e => setMutasiForm({...mutasiForm, rawMaterialId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                >
                  <option value="">-- Pilih Bahan --</option>
                  {rawMaterials.map(rm => (
                    <option key={rm.id} value={rm.id}>{rm.name} (Sisa: {currentStocks[rm.id] || 0} {rm.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah</label>
                <div className="relative">
                  <input 
                    type="number" min="0.01" step="0.01" required value={mutasiForm.quantity === 0 ? '' : mutasiForm.quantity} onChange={e => setMutasiForm({...mutasiForm, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium font-inter pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    {rawMaterials.find(rm => rm.id === mutasiForm.rawMaterialId)?.unit || "Unit"}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Keterangan</label>
                <input 
                  type="text" value={mutasiForm.description} onChange={e => setMutasiForm({...mutasiForm, description: e.target.value})}
                  placeholder={mutasiForm.type === 'in' ? "Misal: Beli di supplier A" : "Misal: Dipakai untuk batch pagi"}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsMutasiModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 ${mutasiForm.type === 'in' ? 'bg-primary hover:bg-primary/90' : 'bg-red-500 hover:bg-red-600'}`}>
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
