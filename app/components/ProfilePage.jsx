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
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [isSubmitActive, setIsSubmitActive] = useState(false);
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

  // Color Palette Daifukumoy
  const colors = {
    bgLight: "#FFF5F8", // Pink sangat tipis lembut
    cardBg: "#FFFFFF", // Putih bersih
    primaryPink: "#E91E63", // Pink Daifukumoy primer
    primaryHover: "#D81B60",
    textDark: "#2D3748",
    textMuted: "#718096",
    borderFocus: "#E91E63",
    inputBg: "#FCFDFE",
    errorBg: "#FEF2F2",
    errorBorder: "#FCA5A5",
    errorText: "#991B1B",
    warningBg: "#FFFBEB", // Kuning lembut
    warningBorder: "#FDE68A", // Kuning border
    warningText: "#92400E", // Kuning gelap teks
    successBg: "#ECFDF5",
    successText: "#065F46",
    successBorder: "#A7F3D0",
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: colors.bgLight,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      position: "relative",
    },
    // Banner Warning di paling atas halaman jika WhatsApp kosong
    warningBanner: {
      width: "100%",
      maxWidth: "560px",
      backgroundColor: colors.warningBg,
      border: `1px solid ${colors.warningBorder}`,
      borderRadius: "18px",
      padding: "16px 20px",
      marginBottom: "20px",
      boxShadow: "0 10px 15px -3px rgba(245, 158, 11, 0.05)",
      display: "flex",
      gap: "14px",
      alignItems: "flex-start",
      transition: "all 0.3s ease",
      animation: "pulse 2s infinite ease-in-out",
    },
    warningTitle: {
      fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
      fontWeight: "700",
      fontSize: "14px",
      color: colors.warningText,
      margin: "0 0 4px 0",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    warningDesc: {
      fontSize: "13px",
      color: "#78350F",
      margin: 0,
      lineHeight: "1.5",
    },
    // Kartu Utama
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: "28px",
      padding: "40px 36px",
      width: "100%",
      maxWidth: "560px",
      boxShadow: "0 20px 40px rgba(233, 30, 99, 0.04), 0 1px 3px rgba(0, 0, 0, 0.01)",
      border: "1px solid rgba(233, 30, 99, 0.06)",
      transition: "all 0.3s ease",
    },
    // Kontrol Panel Testing
    testPanel: {
      width: "100%",
      maxWidth: "560px",
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      borderRadius: "20px",
      padding: "16px 24px",
      marginTop: "24px",
      border: "1px dashed #CBD5E1",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
    },
    testPanelTitle: {
      fontSize: "12px",
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: "1px",
      margin: 0,
    },
    testButtonGroup: {
      display: "flex",
      gap: "12px",
      width: "100%",
    },
    testButton: (active) => ({
      flex: 1,
      padding: "10px 14px",
      borderRadius: "12px",
      border: active ? `2px solid ${colors.primaryPink}` : "1.5px solid #E2E8F0",
      backgroundColor: active ? "#FFF0F5" : "#FFFFFF",
      color: active ? colors.primaryPink : colors.textDark,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      outline: "none",
    }),
    profileHeader: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      marginBottom: "32px",
      borderBottom: "1px solid #F1F5F9",
      paddingBottom: "24px",
    },
    avatarWrapper: {
      position: "relative",
    },
    avatar: {
      width: "72px",
      height: "72px",
      borderRadius: "50%",
      backgroundColor: "#FFE4E1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      color: colors.primaryPink,
      fontWeight: "700",
      border: `2px solid ${colors.primaryPink}`,
      boxShadow: "0 4px 10px rgba(233, 30, 99, 0.1)",
    },
    googleBadge: {
      position: "absolute",
      bottom: "-2px",
      right: "-2px",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      backgroundColor: "#FFFFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
      border: "1px solid #E2E8F0",
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
      fontWeight: "700",
      fontSize: "22px",
      color: colors.textDark,
      margin: "0 0 6px 0",
    },
    roleBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "13.5px",
      fontWeight: "600",
      color: colors.textDark,
      fontFamily: "var(--font-inter), Inter, sans-serif",
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "14px",
      color: colors.textMuted,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    input: (fieldId) => ({
      width: "100%",
      padding: "13px 16px 13px 42px",
      borderRadius: "14px",
      border: errors[fieldId]
        ? `1.5px solid ${colors.errorBorder}`
        : focusedField === fieldId
        ? `1.5px solid ${colors.borderFocus}`
        : `1.5px solid #E2E8F0`,
      backgroundColor: colors.inputBg,
      fontSize: "14.5px",
      color: "#1E293B",
      outline: "none",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      transition: "all 0.2s ease-in-out",
      boxShadow: focusedField === fieldId
        ? `0 0 0 3px rgba(233, 30, 99, 0.12)`
        : errors[fieldId]
        ? `0 0 0 3px rgba(239, 68, 68, 0.1)`
        : "none",
    }),
    errorMessage: {
      fontSize: "12px",
      color: "#DC2626",
      marginTop: "2px",
      fontWeight: "500",
    },
    submitButton: {
      width: "100%",
      padding: "14px 20px",
      borderRadius: "14px",
      backgroundColor: colors.primaryPink,
      color: "#FFFFFF",
      fontSize: "16px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      marginTop: "8px",
      boxShadow: isSubmitHovered
        ? "0 8px 20px rgba(233, 30, 99, 0.3)"
        : "0 4px 12px rgba(233, 30, 99, 0.15)",
      transform: isSubmitActive ? "scale(0.98)" : isSubmitHovered ? "translateY(-1px)" : "scale(1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      outline: "none",
    },
    successAlert: {
      padding: "16px",
      borderRadius: "16px",
      backgroundColor: colors.successBg,
      border: `1px solid ${colors.successBorder}`,
      color: colors.successText,
      fontSize: "13.5px",
      lineHeight: "1.5",
      marginTop: "20px",
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
    }
  };

  // Flag untuk mendeteksi apakah WhatsApp kosong
  const isWhatsappEmpty = !profileData.whatsapp.trim();

  return (
    <div style={styles.container}>
      
      {/* 3. SISTEM PENGUNCI - Banner Warning Aktif HANYA JIKA WhatsApp Kosong */}
      {isWhatsappEmpty && (
        <div style={styles.warningBanner}>
          {/* Warning Sign SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.warningText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <h4 style={styles.warningTitle}>Peringatan Pengaman Akun</h4>
            <p style={styles.warningDesc}>
              PENTING: Anda mendaftar menggunakan Google. Mohon lengkapi Nomor WhatsApp aktif Anda di bawah ini agar Admin dapat memproses pesanan dan mengaktifkan fitur Checkout Anda!
            </p>
          </div>
        </div>
      )}

      {/* Kartu Profil Utama */}
      <div style={styles.card}>
        
        {/* Header Profile Section */}
        <div style={styles.profileHeader}>
          <div style={styles.avatarWrapper}>
            <div style={styles.avatar}>
              {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            
            {/* Google Badge Dihapus untuk keseragaman, atau bisa dicek jika user punya provider google */}
          </div>
          
          <div style={styles.headerText}>
            <h2 style={styles.title}>Pengaturan Profil</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {/* Badge Tipe User */}
              <span style={{
                ...styles.roleBadge,
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
              }}>
                Reseller Resmi
              </span>

              {/* Status Fitur Checkout (Terkunci vs Aktif) */}
              <span style={{
                ...styles.roleBadge,
                backgroundColor: isWhatsappEmpty ? "#FEF2F2" : "#ECFDF5",
                color: isWhatsappEmpty ? "#EF4444" : "#10B981",
              }}>
                {isWhatsappEmpty ? "🔴 Checkout Terkunci" : "🟢 Checkout Aktif"}
              </span>
            </div>
          </div>
        </div>

        {/* Formulir Profil */}
        <form onSubmit={handleSaveProfile} style={styles.form}>
          
          {/* 1. Input: Nama Lengkap */}
          <div style={styles.inputGroup}>
            <label htmlFor="fullName" style={styles.label}>Nama Lengkap</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
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
                style={styles.input("fullName")}
              />
            </div>
          </div>

          {/* 2. Input: Nomor WhatsApp (Sistem Onboarding Kunci Utama) */}
          <div style={styles.inputGroup}>
            <label htmlFor="whatsapp" style={styles.label}>
              Nomor WhatsApp <span style={{ color: colors.primaryPink }}>*</span>
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
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
                style={styles.input("whatsapp")}
              />
            </div>
            {errors.whatsapp && <span style={styles.errorMessage}>{errors.whatsapp}</span>}
          </div>

          {/* 3. Input: Email */}
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
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
                style={styles.input("email")}
              />
            </div>
          </div>

          {/* Tombol Simpan Perubahan */}
          <button
            type="submit"
            onMouseEnter={() => setIsSubmitHovered(true)}
            onMouseLeave={() => {
              setIsSubmitHovered(false);
              setIsSubmitActive(false);
            }}
            onMouseDown={() => setIsSubmitActive(true)}
            onMouseUp={() => setIsSubmitActive(false)}
            style={styles.submitButton}
          >
            Simpan Perubahan
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </form>

        {/* Visual Success Toast inside Card Form */}
        {showSuccessAlert && (
          <div style={styles.successAlert}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            <div>
              <strong style={{ display: "block", marginBottom: "2px", fontWeight: "600" }}>Profil Berhasil Diperbarui!</strong>
              Sinkronisasi data ke Supabase & sistem verifikasi internal selesai. Lencana Checkout Anda sekarang **Aktif**.
            </div>
          </div>
        )}
      </div>

      {/* Panel simulasi telah dihapus sepenuhnya sesuai permintaan */}

    </div>
  );
}
