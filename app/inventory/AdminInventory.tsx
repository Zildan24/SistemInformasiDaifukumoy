"use client";

import React, { useState } from "react";
import { useData, Product } from "../context/DataContext";
import { supabase } from "../../lib/supabaseClient";
import { Plus, Edit2, Trash2, Box, Image as ImageIcon, X } from "lucide-react";

export default function AdminInventory() {
  const { products, addProduct, updateProduct, deleteProduct, channels, locations } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hpp, setHpp] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const categories = existingCategories.length > 0 ? existingCategories : ["daifuku", "mochi bites", "minuman", "lainnya"];

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setCategory("");
    setImageUrl("");
    setHpp("");
    setPrices({});
    setIsActive(true);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setViewingProduct(null); // Close viewing modal if open
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setCategory(product.category || "daifuku");
    setImageUrl(product.imageUrl);
    setHpp(product.hpp ? product.hpp.toString() : "");
    setPrices(product.prices || {});
    setIsActive(product.isActive !== false);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !hpp) return;

    setIsUploading(true);
    let finalImageUrl = imageUrl;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('products').upload(filePath, imageFile);
      
      if (uploadError) {
        alert("Gagal mengupload gambar ke Supabase: " + uploadError.message + "\nPastikan Anda sudah membuat bucket 'products' dan mensetting public/RLS.");
        setIsUploading(false);
        return;
      }
      
      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      finalImageUrl = data.publicUrl;
    }

    const filteredPrices = Object.fromEntries(Object.entries(prices).filter(([_, v]) => v > 0));
    const fallbackPrice = Object.values(filteredPrices)[0] || 0; // Use the first specific price as base price

    const productData = {
      name,
      price: fallbackPrice,
      description,
      imageUrl: finalImageUrl,
      category,
      hpp: parseInt(hpp) || 0,
      prices: filteredPrices,
      isActive
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData);
    }

    setIsUploading(false);
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val).replace(",00", "");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Box className="text-primary" /> Master Data Produk
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola katalog produk yang akan ditampilkan ke Reseller dan Stand.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform transform hover:scale-[1.02] shadow-md shadow-primary/30"
        >
          <Plus size={20} /> Tambah Produk Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setCategoryFilter("all")} 
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${categoryFilter === "all" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoryFilter(cat)} 
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap capitalize transition-all ${categoryFilter === cat ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <ImageIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari produk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <div 
            key={product.id} 
            onClick={() => setViewingProduct(product)}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all group flex flex-col cursor-pointer ${product.isActive === false ? 'opacity-60 grayscale-[50%]' : ''}`}
          >
            <div className="aspect-square bg-gray-50 relative flex items-center justify-center text-gray-300 group-hover:bg-primary/5 transition-colors overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={32} className="opacity-30" />
              )}
              {product.category && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-bold text-gray-500 uppercase shadow-sm">
                  {product.category}
                </div>
              )}
              {product.isActive === false && (
                <div className="absolute top-2 right-2 bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-bold text-white shadow-sm">
                  NONAKTIF
                </div>
              )}
            </div>
            
            <div className="p-3 text-center">
              <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 tracking-wider">Nama Produk</label>
                    <input 
                      type="text" value={name} onChange={e => setName(e.target.value)} required 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium" 
                      placeholder="Contoh: Dubai Chewy Cookie" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 tracking-wider">HPP (Modal) (Rp)</label>
                    <input 
                      type="number" value={hpp} onChange={e => setHpp(e.target.value)} required 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium" 
                      placeholder="Contoh: 20000" 
                    />
                  </div>
                  <div className="col-span-2 flex items-center mt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-3 text-sm font-bold text-gray-700">Status Aktif (Tampil di Katalog)</span>
                    </label>
                  </div>
                </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-800 mb-1">Harga Jual per Kanal (Opsional)</h4>
                <p className="text-[10px] text-gray-500 mb-3">Set harga khusus untuk tiap kanal. Kosongkan jika ingin menggunakan Harga Dasar.</p>
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-48 overflow-y-auto no-scrollbar">
                  {channels.map(channel => (
                    <div key={channel.id} className="flex items-center gap-2 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                      <label className="w-1/2 text-xs font-bold text-gray-700 line-clamp-1">{channel.name}</label>
                      <input 
                        type="number" 
                        value={prices[channel.id] || ""} 
                        onChange={e => setPrices({...prices, [channel.id]: e.target.value === '' ? ('' as any) : parseInt(e.target.value) || 0})}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all text-xs font-medium" 
                        placeholder="Harga Dasar" 
                      />
                    </div>
                  ))}
                </div>
              </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 tracking-wider">Kategori</label>
                  <input 
                    type="text" 
                    list="category-list"
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Pilih atau ketik kategori baru"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium capitalize"
                  />
                  <datalist id="category-list">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 tracking-wider">Foto Produk</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 overflow-hidden shrink-0">
                    {imageUrl ? <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" /> : <Plus size={24} />}
                  </div>
                  <label className="flex-1">
                    <div className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 text-center cursor-pointer hover:bg-gray-50 transition-colors border-dashed border-2">
                      Upload dari Perangkat
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                        setImageUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }}/>
                  </label>
                </div>
              </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 tracking-wider">Deskripsi</label>
                  <textarea 
                    value={description} onChange={e => setDescription(e.target.value)} rows={2}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none text-sm font-medium" 
                    placeholder="Keterangan singkat produk..." 
                  />
                </div>
              </div>
              
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0 rounded-b-3xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md shadow-primary/30 transition-transform transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? "Mengupload..." : (editingProduct ? "Simpan Perubahan" : "Simpan Produk")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="relative h-48 bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">
              {viewingProduct.imageUrl ? (
                <img src={viewingProduct.imageUrl} alt={viewingProduct.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={48} className="opacity-30" />
              )}
              <button 
                onClick={() => setViewingProduct(null)} 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
              {viewingProduct.category && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-gray-700 uppercase shadow-md">
                  {viewingProduct.category}
                </div>
              )}
              {viewingProduct.isActive === false && (
                <div className="absolute top-4 right-14 bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-white shadow-md">
                  NONAKTIF
                </div>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-800 leading-tight mb-2">{viewingProduct.name}</h3>
                <p className="text-gray-600 text-sm">{viewingProduct.description || "Tidak ada deskripsi."}</p>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">HPP (Modal)</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(viewingProduct.hpp || 0)}</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider border-b border-gray-100 pb-2">Harga Jual per Kanal</h4>
                <div className="space-y-3">
                  {channels.map(channel => {
                    const pPrice = viewingProduct.prices?.[channel.id];
                    return (
                      <div key={channel.id} className="flex justify-between items-center bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                        <span className="font-bold text-gray-800">{channel.name}</span>
                        <span className="font-bold text-gray-800">{pPrice ? formatCurrency(pPrice) : <span className="text-gray-400 font-normal italic">Belum diset (Harga Dasar)</span>}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0">
              <button 
                onClick={() => {
                  openEditModal(viewingProduct);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-colors"
              >
                <Edit2 size={18} /> Edit
              </button>
              <button 
                onClick={() => {
                  deleteProduct(viewingProduct.id);
                  setViewingProduct(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors"
              >
                <Trash2 size={18} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
