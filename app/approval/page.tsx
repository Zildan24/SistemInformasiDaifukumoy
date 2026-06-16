"use client";

import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { ClipboardCheck, Check, Box, Clock, Phone } from "lucide-react";
import { confirmAction, showSuccess } from "../utils/alert";

export default function ApprovalCenterPage() {
  const { preOrders, products, updatePreOrderStatus } = useData();
  const [filter, setFilter] = useState<"all" | "pesanan diterima" | "sedang dibuat" | "siap diambil" | "selesai">("pesanan diterima");
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const filteredPOs = preOrders.filter(po => filter === "all" || po.status === filter);

  // Calculate group counts for each status
  const groupCounts = useMemo(() => {
    const groups: Record<string, string> = {};
    preOrders.forEach(po => {
      const key = `${po.resellerId}_${po.pickupDate}_${po.status}`;
      groups[key] = po.status;
    });
    
    const statuses = Object.values(groups);
    return {
      "pesanan diterima": statuses.filter(s => s === "pesanan diterima").length,
      "sedang dibuat": statuses.filter(s => s === "sedang dibuat").length,
      "siap diambil": statuses.filter(s => s === "siap diambil").length,
      "selesai": statuses.filter(s => s === "selesai").length,
      "all": statuses.length,
    };
  }, [preOrders]);
  // Group POs by reseller, pickupDate, and status
  const groupedPOs = useMemo(() => {
    const groups: Record<string, {
      id: string; // generated group id
      resellerId: string;
      resellerName: string;
      pickupDate: string;
      status: string;
      items: any[];
      totalAmount: number;
    }> = {};

    filteredPOs.forEach(po => {
      // Grouping key based on transaction commonalities
      const key = `${po.resellerId}_${po.pickupDate}_${po.status}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          resellerId: po.resellerId,
          resellerName: po.resellerName,
          resellerPhone: po.resellerPhone,
          pickupDate: po.pickupDate,
          status: po.status,
          items: [],
          totalAmount: 0
        };
      }
      
      const product = products.find(p => p.id === po.productId);
      const subtotal = (product?.price || 0) * po.quantity;
      
      groups[key].items.push({ ...po, product, subtotal });
      groups[key].totalAmount += subtotal;
    });

    const result = Object.values(groups);
    
    // Sort: pending (pesanan diterima) first, then date
    result.sort((a, b) => {
      if (a.status === "pesanan diterima" && b.status !== "pesanan diterima") return -1;
      if (a.status !== "pesanan diterima" && b.status === "pesanan diterima") return 1;
      return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
    });
    
    return result;
  }, [filteredPOs, products]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sedang dibuat": return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Sedang Dibuat</span>;
      case "siap diambil": return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Siap Diambil</span>;
      case "selesai": return <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Selesai</span>;
      default: return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse whitespace-nowrap">Pesanan Diterima</span>;
    }
  };

  const handleUpdateStatus = async (group: any, newStatus: any, confirmTitle: string, confirmDesc: string, successTitle: string, successDesc: string) => {
    const confirmed = await confirmAction(confirmTitle, confirmDesc);
    if (confirmed) {
      // Update all items in the group
      for (const item of group.items) {
        await updatePreOrderStatus(item.id, newStatus);
      }
      showSuccess(successTitle, successDesc);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="text-primary" /> Kelola Pesanan PO
          </h2>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar">
          {(["pesanan diterima", "sedang dibuat", "siap diambil", "selesai", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === f ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{f === "all" ? "Semua" : f}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filter === f ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                {groupCounts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* PO List */}
      <div className="space-y-4">
        {groupedPOs.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center">
            <ClipboardCheck size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">Tidak Ada Data</h3>
            <p className="text-gray-500">Belum ada pesanan untuk filter saat ini.</p>
          </div>
        ) : (
          groupedPOs.map(group => (
            <div key={group.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-y border-r border-gray-100 transition-all ${group.status === 'pesanan diterima' ? 'border-l-orange-400' : group.status === 'sedang dibuat' ? 'border-l-blue-400' : group.status === 'siap diambil' ? 'border-l-green-400' : 'border-l-teal-400'}`}>
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
                
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                    <Box size={20} />
                  </div>
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-800">{group.resellerName}</h3>
                      {group.resellerPhone && (
                        <a 
                          href={`https://wa.me/${group.resellerPhone.replace(/\D/g, '').replace(/^0/, '62')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors shrink-0"
                          title="Hubungi via WhatsApp"
                        >
                          <Phone size={12} fill="currentColor" strokeWidth={0} />
                        </a>
                      )}
                      <button 
                        onClick={() => setSelectedGroup(group)}
                        className="text-xs font-bold text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 ml-1"
                      >
                        Lihat Detail
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-1.5">
                      <p className="text-xs text-gray-500">
                        Tanggal Ambil: <span className="font-bold text-gray-700">{new Date(group.pickupDate).toLocaleDateString("id-ID", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        Total: <span className="text-primary">{formatCurrency(group.totalAmount)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 md:pl-4 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 w-full md:w-auto">
                  <div className="self-end sm:self-center">
                    {getStatusBadge(group.status)}
                  </div>
                  
                  {/* Action Buttons */}
                  {group.status === "pesanan diterima" && (
                    <button 
                      onClick={() => handleUpdateStatus(group, "sedang dibuat", "Proses Pesanan?", "Status akan diubah menjadi Sedang Dibuat untuk seluruh produk dalam pesanan ini.", "Diproses!", "Pesanan mulai dibuat di dapur.")}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/30 whitespace-nowrap"
                    >
                      <Clock size={18} /> Proses Semua
                    </button>
                  )}

                  {group.status === "sedang dibuat" && (
                    <button 
                      onClick={() => handleUpdateStatus(group, "siap diambil", "Pesanan Siap?", "Status akan diubah menjadi Siap Diambil untuk seluruh produk dalam pesanan ini.", "Siap!", "Seluruh pesanan kini siap diambil oleh reseller.")}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-green-500/30 whitespace-nowrap"
                    >
                      <Check size={18} /> Semua Siap
                    </button>
                  )}

                  {group.status === "siap diambil" && (
                    <button 
                      onClick={() => handleUpdateStatus(group, "selesai", "Tandai Selesai?", "Pesanan telah diambil oleh reseller. Stok global akan disesuaikan untuk seluruh produk.", "Selesai!", "Pre-Order telah berhasil diselesaikan.")}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-teal-500/30 whitespace-nowrap"
                    >
                      <ClipboardCheck size={18} /> Tandai Selesai
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Rincian Transaksi</h3>
              <button onClick={() => setSelectedGroup(null)} className="text-gray-400 hover:text-red-500 p-2 rounded-xl transition-colors font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-5 overflow-y-auto flex-1">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Reseller</span>
                <span className="font-bold text-gray-800">{selectedGroup.resellerName}</span>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3 mb-6">
                <Clock size={20} className="text-primary" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Jadwal Pengambilan</p>
                  <p className="text-sm font-bold text-gray-700">{new Date(selectedGroup.pickupDate).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Status PO</span>
                {getStatusBadge(selectedGroup.status)}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Daftar Produk ({selectedGroup.items.length})</p>
                {selectedGroup.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                        <Box size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{item.product?.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} Pcs</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-700 text-sm">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-100 mt-4">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Bayar</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(selectedGroup.totalAmount)}</span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-50 shrink-0 bg-white">
              <button 
                onClick={() => setSelectedGroup(null)}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold shadow-lg transition-all"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
