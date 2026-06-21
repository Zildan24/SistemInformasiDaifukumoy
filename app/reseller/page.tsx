"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useData, Product, PreOrder } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { ShoppingCart, Clock, Plus, Minus, Trash2, X, AlertCircle, Search, Phone, AtSign, Mail, MapPin } from "lucide-react";
import { confirmAction, showSuccess, showError } from "../utils/alert";

type CartItem = {
  product: Product;
  quantity: number;
};

export default function ResellerCatalogPage() {
  const { products, stocks, addPreOrder, updatePreOrderStatus, channels, promoBanners, refreshData } = useData();
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // Cart & Modal States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("");

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("daifukumoy_reseller_cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("daifukumoy_reseller_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);
  
  // Add to Cart Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Banner Carousel ---
  const activeBanners = useMemo(() => promoBanners.filter(b => b.isActive), [promoBanners]);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (activeBanners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % activeBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const categories = existingCategories.length > 0 ? existingCategories : ["daifuku", "mochi bites", "minuman", "lainnya"];
  const currentResellerId = currentUser?.id || "r1";
  const currentResellerName = currentUser?.name || "Siti Reseller";

  const resellerChannelId = useMemo(() => {
    return channels.find(c => c.name.toLowerCase().includes("reseller"))?.id || "";
  }, [channels]);

  const getProductPrice = (product: Product) => {
    if (resellerChannelId && product.prices && product.prices[resellerChannelId]) {
      return product.prices[resellerChannelId];
    }
    return product.price;
  };

  // --- Add to Cart Logic ---
  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product);
    setTempQuantity(1);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === selectedProduct.id);
      if (existing) {
        return prev.map(item => item.product.id === selectedProduct.id ? { ...item, quantity: item.quantity + tempQuantity } : item);
      }
      return [...prev, { product: selectedProduct, quantity: tempQuantity }];
    });
    
    setSelectedProduct(null);
  };

  // --- Cart Management Logic ---
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotalAmount = cart.reduce((acc, item) => acc + (getProductPrice(item.product) * item.quantity), 0);
  const cartItemCount = cart.length;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // --- SISTEM PENGUNCI - Validasi Wajib Isi WhatsApp Sebelum Checkout ---
    if (!currentUser?.phone_number || !currentUser.phone_number.trim()) {
      await showError(
        "Checkout Terkunci!",
        "PENTING: Nomor WhatsApp Anda masih kosong! Harap lengkapi Nomor WhatsApp aktif Anda di menu Profil Reseller terlebih dahulu agar Admin dapat memproses pesanan dan mengaktifkan fitur Checkout Anda."
      );
      router.push("/profile");
      return;
    }

    const selectedDateObj = new Date(pickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minPickupDate = new Date(today);
    minPickupDate.setDate(minPickupDate.getDate() + 2);

    if (selectedDateObj < minPickupDate) {
      showError("Tanggal Tidak Valid", "Tanggal pengambilan minimal H+2 dari hari ini!");
      return;
    }

    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (totalQty < 50) {
      showError("Pembelian Minimum", `Minimal pembelian untuk Reseller adalah 50 pcs. Anda baru memilih ${totalQty} pcs.`);
      return;
    }

    const isConfirmed = await confirmAction(
      "Kirim Pre-Order?",
      `Anda akan memesan ${cartItemCount} jenis produk dengan total ${formatCurrency(cartTotalAmount)}. Proses ini tidak dapat dibatalkan.`,
      "Ya, Kirim PO"
    );

    if (isConfirmed) {
      try {
        const item_details = cart.map(item => ({
          id: item.product.id,
          price: getProductPrice(item.product),
          quantity: item.quantity,
          name: item.product.name.substring(0, 50)
        }));

        const response = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: `PO-${Date.now()}-${currentResellerId.substring(0, 8)}`,
            gross_amount: cartTotalAmount,
            first_name: currentResellerName,
            email: currentUser?.email || 'reseller@daifukumoy.com',
            item_details: item_details
          })
        });

        const data = await response.json();

        if (data.token) {
          // Immediately insert the order into the Supabase database with status 'menunggu pembayaran'
          const orderId = `PO-${Date.now()}-${currentResellerId.substring(0, 8)}`;
          const batchCreatedAt = new Date().toISOString();
          const createdOrders: PreOrder[] = [];
          
          try {
            for (const item of cart) {
              const po = await addPreOrder({
                resellerId: currentResellerId,
                resellerName: currentResellerName,
                productId: item.product.id,
                quantity: item.quantity,
                pickupDate: pickupDate,
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
            return;
          }

          // @ts-ignore
          window.snap.pay(data.token, {
            onSuccess: async function(result: any) {
              try {
                // Update status of all created orders to 'pesanan diterima'
                for (const order of createdOrders) {
                  await updatePreOrderStatus(order.id, 'pesanan diterima', undefined, true);
                }
                await refreshData();
                setCart([]);
                localStorage.removeItem("daifukumoy_reseller_cart");
                setPickupDate("");
                setIsCartOpen(false);
                showSuccess("Pembayaran Sukses!", "Pesanan PO Anda telah diterima dan masuk antrean produksi.");
              } catch (e) {
                console.error("Update PO success status error:", e);
                showError("Gagal Menyimpan", "Pembayaran berhasil tetapi gagal memperbarui status pesanan ke database.");
              }
            },
            onPending: function(result: any) {
              setCart([]);
              localStorage.removeItem("daifukumoy_reseller_cart");
              setPickupDate("");
              setIsCartOpen(false);
              router.push("/reseller/history");
            },
            onError: function(result: any) {
              setCart([]);
              localStorage.removeItem("daifukumoy_reseller_cart");
              setPickupDate("");
              setIsCartOpen(false);
              router.push("/reseller/history");
            },
            onClose: function() {
              setCart([]);
              localStorage.removeItem("daifukumoy_reseller_cart");
              setPickupDate("");
              setIsCartOpen(false);
              router.push("/reseller/history");
            }
          });
        } else {
          showError("Gagal", "Tidak dapat membuat sesi pembayaran: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Checkout failed:", error);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isActive === false) return false;
      const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="relative min-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Banner Carousel */}
      {activeBanners.length > 0 && (
        <div className="relative w-full aspect-[2.5/1] md:aspect-auto md:h-64 rounded-3xl overflow-hidden mb-8 shadow-md group bg-white">
          {activeBanners.map((banner, index) => {
            const Content = () => (
              <div className="w-full h-full bg-white flex items-center justify-center">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-contain" />
              </div>
            );

            return (
              <div 
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {banner.clickUrl ? (
                  <a href={banner.clickUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                    <Content />
                  </a>
                ) : (
                  <div className="w-full h-full">
                    <Content />
                  </div>
                )}
              </div>
            );
          })}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {activeBanners.map((_, index) => (
              <button 
                key={index} 
                onClick={() => setCurrentBanner(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentBanner ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      )}



      {/* Filter & Search Bar */}
      <div className="sticky -top-6 z-40 bg-white/95 backdrop-blur-md p-4 rounded-b-3xl shadow-md border-b border-gray-100 flex flex-col md:flex-row items-center gap-4 mb-8 transition-all -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setCategoryFilter("all")} 
            className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${categoryFilter === "all" ? "bg-white text-primary shadow-md" : "text-gray-400"}`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoryFilter(cat)} 
              className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all ${categoryFilter === cat ? "bg-white text-primary shadow-md" : "text-gray-400"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari produk favorit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 pb-24">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl sm:rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative">
            <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden group-hover:bg-primary/5 transition-colors">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <ShoppingCart className="text-gray-200 w-8 h-8 sm:w-12 sm:h-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />
              )}
              {product.category && (
                <div className="absolute top-1 left-1 sm:top-4 sm:left-4 bg-white/80 backdrop-blur-md px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-wider sm:tracking-widest shadow-sm">
                  {product.category}
                </div>
              )}
              {/* Floating Add Button for Mobile */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openQuantityModal(product);
                }}
                className="absolute bottom-1.5 right-1.5 sm:hidden w-7 h-7 bg-primary text-white rounded-full shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-10"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="p-2 sm:p-6 flex-1 flex flex-col">
              <h4 className="font-bold text-gray-800 text-xs sm:text-lg line-clamp-1">{product.name}</h4>
              <p className="text-primary font-black text-xs sm:text-xl mt-0.5 sm:mt-1 mb-1 sm:mb-4">{formatCurrency(getProductPrice(product))}</p>
              <div className="mt-auto hidden sm:block">
                <button 
                  onClick={() => openQuantityModal(product)}
                  className="w-full py-4 bg-gray-50 hover:bg-primary hover:text-white text-primary font-bold rounded-2xl transition-all border border-primary/10 hover:border-primary flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-primary/20"
                >
                  <Plus size={18} /> Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <ShoppingCart size={64} className="mx-auto text-gray-100 mb-4" />
            <p className="text-gray-400 font-bold">Produk tidak ditemukan</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group animate-in zoom-in-50 duration-300"
        >
          <ShoppingCart size={28} className="group-hover:animate-bounce" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {cartItemCount}
          </span>
        </button>
      )}

      {/* Add to Cart Quantity Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="text-primary" size={20}/> Tentukan Jumlah
              </h3>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <h4 className="font-bold text-gray-800 text-xl">{selectedProduct.name}</h4>
              <p className="text-primary font-bold">{formatCurrency(getProductPrice(selectedProduct))} <span className="text-gray-400 text-sm font-normal">/ unit</span></p>
              
              <div className="flex items-center justify-center gap-4 py-4">
                <button 
                  onClick={() => setTempQuantity(q => q > 1 ? q - 1 : 1)}
                  className="w-12 h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <div className="w-20">
                  <input 
                    type="number" 
                    value={tempQuantity === 0 ? '' : tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                    className="w-full text-center text-2xl font-bold border-b-2 border-primary/30 focus:border-primary outline-none py-2"
                  />
                </div>
                <button 
                  onClick={() => setTempQuantity(q => q + 1)}
                  className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              <button 
                onClick={confirmAddToCart}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/30 transition-transform transform hover:scale-[1.02] active:scale-95"
              >
                Masukkan Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Summary Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="text-primary"/> Ringkasan Checkout
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-4 p-4 border border-gray-100 rounded-2xl shadow-sm relative group">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart size={24} className="text-gray-300"/>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-1 pr-6">{item.product.name}</h4>
                    <p className="text-primary font-bold text-sm mb-2">{formatCurrency(getProductPrice(item.product))}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <button type="button" onClick={() => updateCartQuantity(item.product.id, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-200"><Minus size={14}/></button>
                        <input 
                          type="number" 
                          value={item.quantity === 0 ? '' : item.quantity} 
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updateCartQuantity(item.product.id, val - item.quantity);
                            }
                          }}
                          onBlur={() => {
                            if (item.quantity === 0) removeFromCart(item.product.id);
                          }}
                          className="w-12 text-center text-sm font-bold text-gray-700 outline-none bg-transparent"
                        />
                        <button type="button" onClick={() => updateCartQuantity(item.product.id, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-200"><Plus size={14}/></button>
                      </div>
                      <p className="text-xs font-bold text-gray-400">Pcs</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              {(() => {
                const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
                const remaining = 50 - totalQty;
                return (
                  <div className="mb-4 text-xs font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                    <span>Total di keranjang: <strong className="text-gray-800">{totalQty} Pcs</strong></span>
                    {remaining > 0 ? (
                      <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md text-[10px]">Kurang {remaining} Pcs lagi</span>
                    ) : (
                      <span className="text-green-500 font-bold bg-green-50 px-2 py-0.5 rounded-md text-[10px]">Siap Checkout ✅</span>
                    )}
                  </div>
                );
              })()}
              <form onSubmit={handleCheckout}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Pengambilan</label>
                  <input 
                    type="date" 
                    required
                    value={pickupDate}
                    onChange={e => setPickupDate(e.target.value)}
                    min={(() => {
                      const minD = new Date();
                      minD.setDate(minD.getDate() + 2);
                      return minD.toISOString().split("T")[0];
                    })()}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium" 
                  />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 font-medium">Grand Total</span>
                  <span className="text-xl font-black text-gray-800">{formatCurrency(cartTotalAmount)}</span>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-transform transform hover:scale-[1.02] active:scale-95"
                >
                  Kirim Request PO
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Minimal Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 text-center flex flex-col items-center justify-center space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500">
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"><Phone size={16}/> +62 812-3456-7890</a>
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"><AtSign size={16}/> @daifukumoy</a>
          <a href="#" className="hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium"><Mail size={16}/> kemitraan@daifukumoy.com</a>
          <div className="flex items-center gap-2 text-sm font-medium"><MapPin size={16}/> Garut, Jawa Barat</div>
        </div>
        <div className="text-gray-400 text-xs">
          &copy; {new Date().getFullYear()} Daifukumoy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
