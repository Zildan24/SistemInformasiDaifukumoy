"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";

export default function ProfilePage() {
  const { currentUser, setIsProfileComplete, setCurrentUser } = useAuth(); 

  // State untuk menyimpan data profil secara real-time
  const [profileData, setProfileData] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
  });

  // State pendukung interaktivitas UI
  const [focusedField, setFocusedField] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch data asli dari Supabase saat halaman diload
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('name, phone_number')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        setProfileData({
          fullName: data.name || "",
          whatsapp: data.phone_number || "",
          email: currentUser.email || "", // Email tidak ada di tabel users, ambil dari context
        });
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  // Handler input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Hapus error jika ada perubahan karakter
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handler Simpan Profil ke Database Asli
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileData.whatsapp.trim()) {
      setErrors({ whatsapp: "Nomor WhatsApp wajib diisi untuk mengaktifkan fitur checkout!" });
      alert("❌ [Validasi Gagal]: Nomor WhatsApp Anda masih kosong! Harap lengkapi nomor WhatsApp agar Admin dapat memproses pesanan dan mengaktifkan fitur Checkout.");
      return;
    }

    if (!currentUser?.id) {
      alert("Akses ditolak: User tidak valid atau sesi berakhir.");
      return;
    }

    try {
      // Menjalankan query update ke Supabase
      const { error } = await supabase
        .from('users')
        .update({ 
          name: profileData.fullName,
          phone_number: profileData.whatsapp 
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update state context agar banner langsung hilang secara real-time
      setIsProfileComplete(true);
      if (setCurrentUser) {
        setCurrentUser({ ...currentUser, name: profileData.fullName, phone_number: profileData.whatsapp });
      }

      setShowSuccessAlert(true);
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 5000);
    } catch (err) {
      console.error("Gagal update profil:", err);
      alert("Terjadi kesalahan saat menyimpan perubahan: " + err.message);
    }
  };

  // Flag untuk mendeteksi apakah WhatsApp kosong
  const isWhatsappEmpty = !profileData.whatsapp.trim();

  return (
    <div className="min-h-[85vh] bg-[#FFF5F8] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative">
      
      {/* 3. SISTEM PENGUNCI - Banner Warning Aktif HANYA JIKA WhatsApp Kosong */}
      {isWhatsappEmpty && (
        <div className="w-full max-w-[560px] bg-[#FFFBEB] border border-[#FDE68A] rounded-[18px] p-4 sm:p-5 mb-5 shadow-sm flex gap-3.5 items-start transition-all duration-300 animate-pulse">
          {/* Warning Sign SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <h4 className="font-bold text-sm text-[#92400E] mb-1 flex items-center gap-1.5">Peringatan Pengaman Akun</h4>
            <p className="text-xs sm:text-sm text-[#78350F] leading-relaxed">
              PENTING: Anda mendaftar menggunakan Google. Mohon lengkapi Nomor WhatsApp aktif Anda di bawah ini agar Admin dapat memproses pesanan dan mengaktifkan fitur Checkout Anda!
            </p>
          </div>
        </div>
      )}

      {/* Kartu Profil Utama */}
      <div className="bg-white rounded-[28px] p-6 sm:p-10 w-full max-w-[560px] shadow-lg border border-pink-50/50 transition-all duration-300">
        
        {/* Header Profile Section */}
        <div className="flex items-center gap-4 sm:gap-5 mb-8 border-b border-gray-100 pb-6">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFE4E1] flex items-center justify-center text-xl sm:text-2xl text-primary font-bold border-2 border-primary shadow-sm">
              {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          
          <div className="min-w-0 flex-1">
            <h2 className="font-montserrat font-bold text-xl sm:text-2xl text-gray-800 mb-1.5">Pengaturan Profil</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Badge Tipe User */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] uppercase">
                Reseller Resmi
              </span>

              {/* Status Fitur Checkout (Terkunci vs Aktif) */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase ${
                isWhatsappEmpty ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
              }`}>
                {isWhatsappEmpty ? "🔴 Checkout Terkunci" : "🟢 Checkout Aktif"}
              </span>
            </div>
          </div>
        </div>

        {/* Formulir Profil */}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
          
          {/* 1. Input: Nama Lengkap */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-xs sm:text-sm font-semibold text-gray-700">Nama Lengkap</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={profileData.fullName}
                onChange={handleChange}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan nama lengkap Anda"
                className={`w-full pl-11 pr-4 py-3 bg-[#FCFDFE] border rounded-xl text-sm sm:text-base outline-none transition-all duration-200 ${
                  focusedField === "fullName" ? "border-primary ring-4 ring-primary/10" : "border-gray-200"
                }`}
              />
            </div>
          </div>

          {/* 2. Input: Nomor WhatsApp (Sistem Onboarding Kunci Utama) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="whatsapp" className="text-xs sm:text-sm font-semibold text-gray-700">
              Nomor WhatsApp <span className="text-primary">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                value={profileData.whatsapp}
                onChange={handleChange}
                onFocus={() => setFocusedField("whatsapp")}
                onBlur={() => setFocusedField(null)}
                placeholder="Contoh: 0812-3456-7890"
                className={`w-full pl-11 pr-4 py-3 bg-[#FCFDFE] border rounded-xl text-sm sm:text-base outline-none transition-all duration-200 ${
                  errors.whatsapp ? "border-red-400 ring-4 ring-red-100" : focusedField === "whatsapp" ? "border-primary ring-4 ring-primary/10" : "border-gray-200"
                }`}
              />
            </div>
            {errors.whatsapp && <span className="text-xs text-red-600 font-medium mt-1">{errors.whatsapp}</span>}
          </div>

          {/* 3. Input: Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs sm:text-sm font-semibold text-gray-700">Email</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="nama@email.com"
                className={`w-full pl-11 pr-4 py-3 bg-[#FCFDFE] border rounded-xl text-sm sm:text-base outline-none transition-all duration-200 ${
                  focusedField === "email" ? "border-primary ring-4 ring-primary/10" : "border-gray-200"
                }`}
              />
            </div>
          </div>

          {/* Tombol Simpan Perubahan */}
          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-6 bg-primary hover:bg-[#D81B60] text-white rounded-xl text-sm sm:text-base font-bold shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Simpan Perubahan</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </form>

        {/* Visual Success Toast inside Card Form */}
        {showSuccessAlert && (
          <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex gap-2.5 items-start leading-relaxed animate-in fade-in duration-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            <div>
              <strong className="block mb-0.5 font-bold">Profil Berhasil Diperbarui!</strong>
              Sinkronisasi data ke Supabase & sistem verifikasi internal selesai. Lencana Checkout Anda sekarang <strong className="font-bold">Aktif</strong>.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
