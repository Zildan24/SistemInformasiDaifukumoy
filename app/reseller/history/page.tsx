"use client";

import React, { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { CalendarDays, Clock, CheckCircle, Box, Info } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ResellerHistoryPage() {
  const { products, preOrders } = useData();
  const { currentUser } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const currentResellerId = currentUser?.id || "r1";

  const resellerPOs = useMemo(() => {
    return preOrders
      .filter(po => currentUser?.role === 'admin' || currentUser?.role === 'owner' || po.resellerId === currentResellerId)
  }, [preOrders, currentResellerId, currentUser?.role]);

  // Group POs by pickupDate and status (representing one transaction/batch)
    const groupedPOs = useMemo(() => {
      const groups: Record<string, {
        id: string;
        pickupDate: string;
        status: string;
        createdAt: string;
        items: any[];
        totalAmount: number;
      }> = {};
  
      resellerPOs.forEach(po => {
        // Fallback to pickupDate if createdAt is missing, otherwise truncate to minute (YYYY-MM-DDTHH:mm)
        const timeKey = po.createdAt ? new Date(po.createdAt).toISOString().substring(0, 16) : po.pickupDate;
        const key = `${timeKey}_${po.pickupDate}_${po.status}`;
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            pickupDate: po.pickupDate,
            status: po.status,
            createdAt: po.createdAt || po.pickupDate,
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
    
    // Sort descending by createdAt (or pickupDate as fallback)
    result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return result;
  }, [resellerPOs, products]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sedang dibuat": return <span className="flex items-center gap-1 text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><Clock size={12}/> Diproses</span>;
      case "siap diambil": return <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12}/> Siap Diambil</span>;
      case "selesai": return <span className="flex items-center gap-1 text-teal-600 bg-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12}/> Selesai</span>;
      default: return <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><Clock size={12}/> Diterima</span>;
    }
  };

  return (
    <div className="relative min-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Riwayat Pesanan</h2>
          <p className="text-gray-500 font-medium mt-1">Pantau status seluruh batch Pre-Order Anda.</p>
        </div>
        <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
          <span className="text-xs font-black text-primary uppercase tracking-widest">{groupedPOs.length} Batch Transaksi</span>
        </div>
      </div>

      <div className="space-y-4">
        {groupedPOs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] shadow-sm border border-gray-100 text-center">
            <CalendarDays size={64} className="mx-auto mb-4 text-gray-100" />
            <p className="text-gray-400 font-bold italic">Belum ada riwayat pesanan.</p>
          </div>
        ) : (
          groupedPOs.map(group => (
            <div key={group.id} className="p-6 bg-white rounded-[32px] border border-gray-100 hover:shadow-xl transition-all group flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                    <CalendarDays size={28} />
                  </div>
                  <div className="w-full">
                    <p className="font-bold text-gray-800 text-lg">Batch Transaksi ({group.items.length} Item)</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {group.items.slice(0, 2).map((item, idx) => (
                        <span key={idx} className="text-xs font-medium bg-gray-50 px-2 py-1 rounded-md text-gray-600 border border-gray-100">
                          {item.product?.name} x{item.quantity}
                        </span>
                      ))}
                      {group.items.length > 2 && (
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                          +{group.items.length - 2} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-6 md:gap-10 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                  <div className="text-left sm:text-right hidden md:block w-32 shrink-0">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mb-1">Ambil Pada</p>
                    <p className="text-sm font-bold text-gray-600 truncate">{format(new Date(group.pickupDate), "dd MMM yyyy", { locale: id })}</p>
                  </div>
                  <div className="text-left sm:text-right hidden sm:block w-36 shrink-0">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mb-1">Total Biaya</p>
                    <p className="text-sm font-bold text-primary truncate">{formatCurrency(group.totalAmount)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-4 w-[180px] shrink-0">
                    <div className="flex justify-end w-[130px]">
                      {getStatusBadge(group.status)}
                    </div>
                    <button 
                      onClick={() => setSelectedGroup(group)}
                      className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-primary rounded-xl transition-colors shrink-0"
                      title="Lihat Detail"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PO Detail Modal */}
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
              <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3 mb-6">
                <Clock size={20} className="text-primary" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Jadwal Pengambilan</p>
                  <p className="text-sm font-bold text-gray-700">{format(new Date(selectedGroup.pickupDate), "EEEE, dd MMMM yyyy", { locale: id })}</p>
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
