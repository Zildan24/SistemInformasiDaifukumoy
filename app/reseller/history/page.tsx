"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { CalendarDays, Clock, CheckCircle, Box, Info, X, RotateCcw, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { showSuccess, showError } from "../../utils/alert";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function ResellerHistoryPage() {
  const { products, preOrders, channels, addPreOrder, updatePreOrderStatus, refreshData } = useData();
  const { currentUser } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [reorderGroup, setReorderGroup] = useState<any>(null);
  const [reorderPickupDate, setReorderPickupDate] = useState<string>("");
  const [isSubmittingReorder, setIsSubmittingReorder] = useState<boolean>(false);

  const resellerChannelId = useMemo(() => {
    return channels?.find((c: any) => c.name.toLowerCase().includes("reseller"))?.id || "";
  }, [channels]);

  const getProductPrice = (product: any) => {
    if (resellerChannelId && product.prices && product.prices[resellerChannelId]) {
      return product.prices[resellerChannelId];
    }
    return product.price || 0;
  };

  const searchParams = useSearchParams();
  const router = useRouter();

  const handleExpireOrder = async (orderId: string) => {
    try {
      // 1. Ambil data order yang masih berstatus 'Menunggu Pembayaran'
      const { data: dbOrders, error: fetchError } = await supabase
        .from('pre_orders')
        .select('id, snap_token')
        .eq('status', 'Menunggu Pembayaran');

      if (fetchError) {
        console.error("Error fetching orders in redirect handler:", fetchError);
      }

      // Filter local list berdasarkan orderId yang cocok dengan prefix snapToken
      const matchingOrders = dbOrders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${orderId}:`) || o.snap_token === orderId)
      ) || [];

      // 2. Jika ada pesanan yang perlu diupdate, ubah statusnya di Supabase database ke 'Gagal'
      if (matchingOrders.length > 0) {
        const ids = matchingOrders.map((o: any) => o.id);
        const { error: updateError } = await supabase
          .from('pre_orders')
          .update({ status: 'Gagal' })
          .in('id', ids);

        if (updateError) {
          console.error("Error updating expired orders to Gagal:", updateError);
        } else {
          console.log(`Successfully updated orders ${ids.join(', ')} to Gagal via client redirect.`);
        }
      }

      // 3. Selalu refresh data lokal agar UI terupdate
      await refreshData();
      
      // 4. Tampilkan notifikasi peringatan kedaluwarsa kepada reseller
      showError("Batas Waktu Habis", "Transaksi Anda telah kedaluwarsa. Silakan lakukan pemesanan ulang.");
      
      // 5. Bersihkan query params dari URL agar tidak memicu kembali effect ini
      const params = new URLSearchParams(window.location.search);
      params.delete("order_id");
      params.delete("transaction_status");
      params.delete("status_code");
      router.replace(`${window.location.pathname}?${params.toString()}`);
    } catch (err) {
      console.error("Gagal memproses kedaluwarsa PO:", err);
    }
  };

  const handleSuccessOrder = async (orderId: string) => {
    try {
      // 1. Ambil semua pre_orders dari Supabase yang statusnya 'Menunggu Pembayaran'
      const { data: orders, error: fetchError } = await supabase
        .from("pre_orders")
        .select("id, snap_token, status")
        .eq("status", "Menunggu Pembayaran");

      if (fetchError) {
        console.error("Gagal mengambil PO saat verifikasi sukses:", fetchError);
        return;
      }

      // 2. Filter yang snap_token-nya mengandung orderId ini
      const matchingOrders = orders?.filter(
        (o: any) => o.snap_token && (o.snap_token.startsWith(`${orderId}:`) || o.snap_token === orderId)
      ) || [];

      if (matchingOrders.length > 0) {
        // 3. Update status satu per satu lewat updatePreOrderStatus agar memicu otomatisasi production_plans
        for (const order of matchingOrders) {
          await updatePreOrderStatus(order.id, 'pesanan diterima', undefined, true);
        }
        
        // 4. Selalu refresh data lokal agar UI terupdate
        await refreshData();
        
        // 5. Tampilkan notifikasi sukses kepada reseller
        showSuccess("Pembayaran Sukses!", "Pesanan PO Anda telah diterima dan masuk antrean produksi.");
      }

      // 6. Bersihkan query params dari URL agar tidak memicu kembali effect ini
      const params = new URLSearchParams(window.location.search);
      params.delete("order_id");
      params.delete("transaction_status");
      params.delete("status_code");
      router.replace(`${window.location.pathname}?${params.toString()}`);
    } catch (err) {
      console.error("Gagal memproses sukses PO:", err);
    }
  };

  const checkAndUpdatePaymentStatus = async (group: any, silent = false) => {
    let snapToken = group.snapToken;
    if (!snapToken && group.items && group.items[0]) {
      snapToken = group.items[0].snapToken;
    }

    if (!snapToken) {
      if (!silent) showError("Gagal", "Sesi/Order ID pembayaran tidak ditemukan.");
      return;
    }

    let orderId = snapToken;
    if (snapToken.includes(':')) {
      orderId = snapToken.split(':')[0];
    }

    try {
      const res = await fetch(`/api/payment/status?order_id=${orderId}`);
      if (!res.ok) {
        if (!silent) showError("Gagal", "Gagal memverifikasi status pembayaran ke Midtrans.");
        return;
      }

      const data = await res.json();
      if (data.status === 'Pesanan Diterima') {
        await refreshData();
        if (!silent) showSuccess("Pembayaran Sukses!", "Status pesanan telah diperbarui menjadi Diterima.");
      } else if (data.status === 'Gagal') {
        await refreshData();
        if (!silent) showError("Batas Waktu Habis", "Pembayaran pesanan ini telah kedaluwarsa.");
      } else {
        if (!silent) showSuccess("Menunggu Pembayaran", `Status transaksi masih: ${data.transactionStatus?.toUpperCase() || 'PENDING'}. Silakan selesaikan pembayaran Anda.`);
      }
    } catch (err) {
      console.error("Gagal memeriksa status pembayaran:", err);
      if (!silent) showError("Gagal", "Terjadi kesalahan saat menghubungi server status.");
    }
  };

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const status = searchParams.get("transaction_status");
    const statusCode = searchParams.get("status_code");

    if (orderId) {
      if (status === "expire") {
        handleExpireOrder(orderId);
      } else if (
        status === "settlement" || 
        status === "capture" || 
        statusCode === "200"
      ) {
        handleSuccessOrder(orderId);
      }
    }
  }, [searchParams]);

  const handleResumePayment = (group: any) => {
    let token = group.snapToken;
    if (!token) {
      showError("Token Tidak Ditemukan", "Sesi pembayaran tidak dapat ditemukan untuk transaksi ini.");
      return;
    }

    if (token.includes(':')) {
      token = token.split(':')[1];
    }

    // @ts-ignore
    window.snap.pay(token, {
      onSuccess: async function(result: any) {
        try {
          // Update status of all pre orders in this group to 'pesanan diterima'
          for (const item of group.items) {
            await updatePreOrderStatus(item.id, 'pesanan diterima', undefined, true);
          }
          await refreshData();
          setSelectedGroup(null);
          showSuccess("Pembayaran Sukses!", "Pesanan PO Anda telah diterima dan masuk antrean produksi.");
        } catch (e) {
          console.error("Update PO success status error:", e);
          showError("Gagal Menyimpan", "Pembayaran berhasil tetapi gagal memperbarui status pesanan ke database.");
        }
      },
      onPending: function(result: any) {
        refreshData();
      },
      onError: function(result: any) {
        refreshData();
      },
      onClose: function() {
        refreshData();
      }
    });
  };

  const handleReorder = (group: any) => {
    if (!group || !group.items) return;
    setReorderGroup(group);
    
    // Set default pickup date (H+2)
    const minD = new Date();
    minD.setDate(minD.getDate() + 2);
    setReorderPickupDate(minD.toISOString().split("T")[0]);
  };

  const handleSubmitReorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderGroup || !reorderGroup.items || !currentUser) return;
    
    // --- SISTEM PENGUNCI - Validasi Wajib Isi WhatsApp Sebelum Checkout ---
    if (!currentUser?.phone_number || !currentUser.phone_number.trim()) {
      await showError(
        "Checkout Terkunci!",
        "PENTING: Nomor WhatsApp Anda masih kosong! Harap lengkapi Nomor WhatsApp aktif Anda di menu Profil Reseller terlebih dahulu agar Admin dapat memproses pesanan dan mengaktifkan fitur Checkout Anda."
      );
      router.push("/profile");
      return;
    }

    const selectedDateObj = new Date(reorderPickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minPickupDate = new Date(today);
    minPickupDate.setDate(minPickupDate.getDate() + 2);

    if (selectedDateObj < minPickupDate) {
      showError("Tanggal Tidak Valid", "Tanggal pengambilan minimal H+2 dari hari ini!");
      return;
    }

    setIsSubmittingReorder(true);
    
    const cartTotalAmount = reorderGroup.items.reduce((acc: number, item: any) => {
      const price = getProductPrice(item.product);
      return acc + (price * item.quantity);
    }, 0);

    const item_details = reorderGroup.items.map((item: any) => ({
      id: item.product.id,
      price: getProductPrice(item.product),
      quantity: item.quantity,
      name: item.product.name.substring(0, 50)
    }));

    const currentResellerId = currentUser?.id || '';
    const currentResellerName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Reseller';
    const orderId = `PO-${Date.now()}-${currentResellerId.substring(0, 8)}`;

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          gross_amount: cartTotalAmount,
          first_name: currentResellerName,
          email: currentUser?.email || 'reseller@daifukumoy.com',
          item_details: item_details
        })
      });

      const data = await response.json();

      if (data.token) {
        const batchCreatedAt = new Date().toISOString();
        const createdOrders: any[] = [];
        
        try {
          for (const item of reorderGroup.items) {
            const po = await addPreOrder({
              resellerId: currentResellerId,
              resellerName: currentResellerName,
              productId: item.product.id,
              quantity: item.quantity,
              pickupDate: reorderPickupDate,
              createdAt: batchCreatedAt,
              status: 'menunggu pembayaran',
              snapToken: `${orderId}:${data.token}`
            });
            if (po) {
              createdOrders.push(po);
            }
          }
        } catch (insertError) {
          console.error("Gagal melakukan insert awal PO:", insertError);
          showError("Gagal Membuat Pesanan", "Gagal menyimpan detail pesanan ke database.");
          setIsSubmittingReorder(false);
          return;
        }

        // Hapus pesanan lama yang telah kedaluwarsa dari database
        const oldOrderIds = reorderGroup.items.map((item: any) => item.id);
        const { error: deleteError } = await supabase
          .from('pre_orders')
          .delete()
          .in('id', oldOrderIds);

        if (deleteError) {
          console.error("Gagal menghapus pesanan lama setelah pesan ulang:", deleteError);
        }

        // Tutup modal ringkasan checkout reorder
        setReorderGroup(null);

        // Buka pembayaran Midtrans Snap
        // @ts-ignore
        window.snap.pay(data.token, {
          onSuccess: async function(result: any) {
            try {
              for (const order of createdOrders) {
                await updatePreOrderStatus(order.id, 'pesanan diterima', undefined, true);
              }
              await refreshData();
              showSuccess("Pembayaran Sukses!", "Pesanan PO Anda telah diterima dan masuk antrean produksi.");
            } catch (e) {
              console.error("Update PO success status error:", e);
              showError("Gagal Menyimpan", "Pembayaran berhasil tetapi gagal memperbarui status pesanan ke database.");
            }
          },
          onPending: async function(result: any) {
            await refreshData();
          },
          onError: async function(result: any) {
            await refreshData();
          },
          onClose: async function() {
            await refreshData();
          }
        });
      } else {
        showError("Gagal", "Tidak dapat membuat sesi pembayaran: " + (data.error || "Unknown error"));
      }
    } catch (paymentError: any) {
      console.error("Payment request error:", paymentError);
      showError("Gagal", "Terjadi kesalahan koneksi saat membuat pembayaran.");
    } finally {
      setIsSubmittingReorder(false);
    }
  };
  
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
        snapToken?: string | null;
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
            totalAmount: 0,
            snapToken: po.snapToken
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

  useEffect(() => {
    const checkPendingPayments = async () => {
      const pendingGroups = groupedPOs.filter(g => g.status === "menunggu pembayaran");
      for (const group of pendingGroups) {
        await checkAndUpdatePaymentStatus(group, true);
      }
    };

    if (groupedPOs.length > 0) {
      checkPendingPayments();
    }
  }, [groupedPOs.length]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "menunggu pembayaran": return <span className="flex items-center gap-1 text-red-600 bg-red-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><Clock size={12}/> Menunggu Pembayaran</span>;
      case "sedang dibuat": return <span className="flex items-center gap-1 text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><Clock size={12}/> Diproses</span>;
      case "siap diambil": return <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12}/> Siap Diambil</span>;
      case "selesai": return <span className="flex items-center gap-1 text-teal-600 bg-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12}/> Selesai</span>;
      case "gagal": return <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"><X size={12}/> Gagal</span>;
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
                  <div className="flex items-center justify-end gap-3 min-w-[220px] shrink-0">
                    <div className="flex justify-end flex-1">
                      {getStatusBadge(group.status)}
                    </div>
                    {["pesanan diterima", "sedang dibuat", "siap diambil", "selesai"].includes(group.status) && (
                      <div className="flex gap-2">
                        <a 
                          href="https://wa.me/6285723557506?text=halo" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-green-200 transition-all active:scale-95 shrink-0"
                        >
                          <svg className="w-4 h-4 text-[#25D366] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span>Hubungi Admin</span>
                        </a>
                        <a 
                          href="https://maps.app.goo.gl/PncZX7qHpjXLEMHF7" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-red-200 transition-all active:scale-95 shrink-0"
                        >
                          <svg className="w-4 h-4 text-[#EA4335] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span>Lokasi Pabrik</span>
                        </a>
                      </div>
                    )}
                    {group.status === "menunggu pembayaran" && (
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await checkAndUpdatePaymentStatus(group);
                          }}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 transition-transform active:scale-95 border border-gray-200"
                        >
                          Cek
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumePayment(group);
                          }}
                          className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm shadow-primary/20 shrink-0 transition-transform active:scale-95"
                        >
                          Bayar
                        </button>
                      </div>
                    )}
                    {group.status === "gagal" && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorder(group);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm shadow-blue-600/20 shrink-0 transition-transform active:scale-95 flex items-center gap-1"
                      >
                        <RotateCcw size={10} /> Pesan Ulang
                      </button>
                    )}
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

            <div className="p-6 border-t border-gray-50 shrink-0 bg-white space-y-3">
              {selectedGroup.status === "menunggu pembayaran" && (
                <button 
                  onClick={() => handleResumePayment(selectedGroup)}
                  className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all"
                >
                  Bayar Sekarang
                </button>
              )}
              {selectedGroup.status === "gagal" && (
                <button 
                  onClick={() => {
                    handleReorder(selectedGroup);
                    setSelectedGroup(null);
                  }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 animate-in fade-in duration-200"
                >
                  <RotateCcw size={16} /> Pesan Ulang
                </button>
              )}
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

      {/* Reorder / Checkout Summary Modal */}
      {reorderGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="text-primary"/> Ringkasan Checkout (Pesan Ulang)
              </h3>
              <button 
                onClick={() => setReorderGroup(null)} 
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                disabled={isSubmittingReorder}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - List of Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {reorderGroup.items.map((item: any) => {
                const price = getProductPrice(item.product);
                return (
                  <div key={item.product.id} className="flex gap-4 p-4 border border-gray-100 rounded-2xl shadow-sm relative">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingCart size={24} className="text-gray-300"/>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{item.product.name}</h4>
                      <p className="text-primary font-bold text-sm mb-1">{formatCurrency(price)}</p>
                      <p className="text-xs font-bold text-gray-500">Jumlah: {item.quantity} Pcs</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer - Date Picker & Checkout Form */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <form onSubmit={handleSubmitReorder}>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Tanggal Pengambilan</label>
                  <input 
                    type="date" 
                    required
                    value={reorderPickupDate}
                    onChange={e => setReorderPickupDate(e.target.value)}
                    min={(() => {
                      const minD = new Date();
                      minD.setDate(minD.getDate() + 2);
                      return minD.toISOString().split("T")[0];
                    })()}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium" 
                    disabled={isSubmittingReorder}
                  />
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-500 text-sm font-medium">Grand Total</span>
                  <span className="text-xl font-black text-gray-800">
                    {formatCurrency(
                      reorderGroup.items.reduce((acc: number, item: any) => acc + (getProductPrice(item.product) * item.quantity), 0)
                    )}
                  </span>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingReorder}
                  className="w-full py-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                >
                  {isSubmittingReorder ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "Bayar Sekarang"
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
