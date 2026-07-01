"use client";

import React, { useState } from "react";
import { useData, PromoBanner } from "../context/DataContext";
import { Plus, X, ImageIcon, Check, Link as LinkIcon, Trash2, Edit2, Play, Pause } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { confirmAction, showSuccess } from "../utils/alert";

export default function BannersPage() {
  const { promoBanners, addPromoBanner, updatePromoBanner, deletePromoBanner } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [slideOrder, setSlideOrder] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const openAddModal = () => {
    setEditingBanner(null);
    setTitle("Promo Banner");
    setSubtitle("");
    setClickUrl("");
    setSlideOrder("0");
    setIsActive(true);
    setImageFile(null);
    setImageUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || "");
    setClickUrl(banner.clickUrl || "");
    setSlideOrder(banner.slideOrder.toString());
    setIsActive(banner.isActive);
    setImageFile(null);
    setImageUrl(banner.imageUrl);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirmAction(`Hapus banner "${name}"?`, "Banner ini tidak akan ditampilkan lagi.");
    if (isConfirmed) {
      await deletePromoBanner(id);
      showSuccess("Terhapus", "Banner telah dihapus.");
    }
  };

  const handleToggleActive = async (banner: PromoBanner) => {
    await updatePromoBanner(banner.id, { isActive: !banner.isActive });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUploading(true);
    let finalImageUrl = imageUrl;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, imageFile);
      
      if (uploadError) {
        alert("Gagal mengupload gambar ke Supabase: " + uploadError.message + "\nPastikan bucket 'banners' memiliki policy insert.");
        setIsUploading(false);
        return;
      }
      
      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
      finalImageUrl = data.publicUrl;
    }

    if (!finalImageUrl && !editingBanner) {
      alert("Harap pilih gambar untuk banner baru!");
      setIsUploading(false);
      return;
    }

    const bannerData = {
      title,
      subtitle: subtitle || undefined,
      imageUrl: finalImageUrl,
      slideOrder: parseInt(slideOrder) || 0,
      isActive,
      clickUrl: clickUrl || undefined
    };

    if (editingBanner) {
      await updatePromoBanner(editingBanner.id, bannerData);
      showSuccess("Tersimpan", "Perubahan banner berhasil disimpan.");
    } else {
      await addPromoBanner(bannerData);
      showSuccess("Berhasil", "Banner baru berhasil ditambahkan.");
    }

    setIsUploading(false);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 pb-32 h-full overflow-y-auto animate-in fade-in duration-500 bg-gray-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <ImageIcon className="text-primary" size={32} />
            Manajemen Banner Promo
          </h1>
          <p className="text-gray-500 font-medium mt-1">Kelola slide promosi (carousel) yang tampil di portal Reseller.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/30 flex items-center gap-2 hover:-translate-y-1 active:scale-95"
        >
          <Plus size={20} /> Tambah Banner Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {promoBanners.map(banner => (
          <div key={banner.id} className={`bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col relative ${!banner.isActive ? 'opacity-70' : ''}`}>
            
            <div className="absolute top-4 right-4 z-10 flex gap-2">
               <button 
                onClick={() => handleToggleActive(banner)}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm transition-all ${banner.isActive ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-500 text-white hover:bg-gray-600'}`}
                title={banner.isActive ? "Nonaktifkan" : "Aktifkan"}
              >
                {banner.isActive ? <Check size={16} /> : <Pause size={16} />}
              </button>
              <button 
                onClick={() => openEditModal(banner)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-blue-600 hover:bg-blue-50 hover:text-blue-700 backdrop-blur-md shadow-sm transition-all"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(banner.id, banner.title)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 backdrop-blur-md shadow-sm transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="absolute top-4 left-4 z-10">
              <span className="bg-white/90 backdrop-blur-md text-gray-800 text-xs font-black px-3 py-1.5 rounded-full shadow-sm">
                Urutan: {banner.slideOrder}
              </span>
            </div>

            <div className="h-48 bg-gray-100 relative group overflow-hidden">
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="mt-auto flex items-center gap-2 text-sm">
                <LinkIcon size={16} className="text-gray-400" />
                <span className="text-gray-500 font-medium truncate">
                  {banner.clickUrl ? banner.clickUrl : "Tidak ada link"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {promoBanners.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Belum Ada Banner</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Tambahkan banner promosi untuk menampilkan diskon atau informasi spesial di katalog Reseller.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-800">{editingBanner ? "Edit Banner" : "Tambah Banner Baru"}</h3>
              <button onClick={() => !isUploading && setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form id="bannerForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Image Upload Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2 tracking-wider">Gambar Banner Promosi</label>
                  <div className="flex items-center gap-6">
                    <div className="w-48 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 overflow-hidden shrink-0">
                      {imageUrl ? <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={32} />}
                    </div>
                    <label className="flex-1">
                      <div className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 text-center cursor-pointer hover:bg-gray-50 hover:border-primary/50 hover:text-primary transition-all border-dashed border-2">
                        Pilih Gambar dari Perangkat
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageFile(e.target.files[0]);
                          setImageUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }}/>
                    </label>
                  </div>
                  <p className="text-[11px] font-medium text-gray-400 mt-2 ml-1">Rekomendasi rasio: 16:9 atau resolusi tinggi memanjang.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2 tracking-wider">Tautan Saat Diklik (Opsional)</label>
                    <input 
                      type="url" 
                      value={clickUrl} 
                      onChange={e => setClickUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2 tracking-wider">Urutan Tampil (0 = Paling Awal)</label>
                    <input 
                      type="number" 
                      value={slideOrder} 
                      onChange={e => setSlideOrder(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Status Aktif</h4>
                    <p className="text-xs font-medium text-gray-500">Tampilkan banner ini di katalog Reseller</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => !isUploading && setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                disabled={isUploading}
              >
                Batal
              </button>
              <button 
                form="bannerForm"
                type="submit"
                disabled={isUploading}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isUploading ? "Menyimpan..." : "Simpan Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
