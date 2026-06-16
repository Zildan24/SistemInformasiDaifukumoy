"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function RegisterForm() {
  // 1. Form state management
  const [formData, setFormData] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    password: "",
  });
  const { registerUser } = useAuth();

  // 2. Interactive States (for premium micro-animations/hover/focus using inline styles)
  const [focusedField, setFocusedField] = useState(null);
  const [isGoogleHovered, setIsGoogleHovered] = useState(false);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [isGoogleActive, setIsGoogleActive] = useState(false);
  const [isSubmitActive, setIsSubmitActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errors, setErrors] = useState({});

  // 3. Form input handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 4. Action Handlers (As requested, before SDK integrations)
  const handleGoogleSignUp = (e) => {
    e.preventDefault();
    console.log("OAuth Clerk Triggered: Google Sign Up");
    alert("🔐 [Clerk OAuth]: Memulai proses pendaftaran dengan Google. Kredensial siap dilempar ke SDK Clerk!");
  };

  const handleSubmitManual = async (e) => {
    e.preventDefault();

    // Basic Validation
    const tempErrors = {};
    if (!formData.fullName.trim()) tempErrors.fullName = "Nama Lengkap wajib diisi";
    if (!formData.whatsapp.trim()) tempErrors.whatsapp = "Nomor WhatsApp wajib diisi";
    if (!formData.email.trim()) tempErrors.email = "Email wajib diisi";
    if (!formData.password.trim()) tempErrors.password = "Password wajib diisi";
    
    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    try {
      await registerUser(formData);
      // Show beautiful success card
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 6000);
    } catch (err) {
      console.error("Error Registrasi:", err);
      alert("Pendaftaran Gagal: " + err.message);
    }
  };

  // 5. Stylings Objects (Daifukumoy Premium Aesthetic System)
  const colors = {
    bgLight: "#FFF0F5", // Pink sangat muda/tipis (LavenderBlush)
    cardBg: "#FFFFFF", // Putih bersih
    primaryPink: "#E91E63", // Merah muda/pink primer
    primaryHover: "#D81B60", // Pink gelap hover
    textPrimary: "#D81B60", // Pink tua untuk judul utama
    textDark: "#2D3748", // Abu-abu gelap/charcoal
    textMuted: "#718096", // Muted gray
    borderLight: "#F0F2F5",
    borderFocus: "#E91E63",
    inputBg: "#FAFAFA",
    errorColor: "#E53E3E",
    whatsappGreen: "#25D366"
  };

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgLight,
      padding: "24px",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    // Decorative background blobs for luxurious visual depth
    bgBlob1: {
      position: "absolute",
      top: "-10%",
      right: "-10%",
      width: "40vw",
      height: "40vw",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,182,193,0.3) 0%, rgba(255,240,245,0) 70%)",
      zIndex: 0,
      pointerEvents: "none",
    },
    bgBlob2: {
      position: "absolute",
      bottom: "-10%",
      left: "-10%",
      width: "45vw",
      height: "45vw",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(248,187,208,0.3) 0%, rgba(255,240,245,0) 70%)",
      zIndex: 0,
      pointerEvents: "none",
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: "24px",
      padding: "40px 32px",
      width: "100%",
      maxWidth: "480px",
      boxShadow: "0 20px 40px rgba(233, 30, 99, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
      zIndex: 1,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      border: "1px solid rgba(233, 30, 99, 0.08)",
    },
    headerWrapper: {
      textAlign: "center",
      marginBottom: "28px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    title: {
      fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
      fontWeight: "600",
      fontSize: "26px",
      color: colors.textPrimary,
      margin: "0 0 6px 0",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      fontSize: "14px",
      color: colors.textMuted,
      margin: 0,
      lineHeight: "1.5",
    },
    googleButton: {
      width: "100%",
      padding: "13px 16px",
      borderRadius: "14px",
      border: "1.5px solid #E2E8F0",
      backgroundColor: isGoogleHovered ? "#F8FAFC" : "#FFFFFF",
      color: colors.textDark,
      fontSize: "15px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      boxShadow: isGoogleHovered ? "0 4px 12px rgba(0, 0, 0, 0.04)" : "none",
      transform: isGoogleActive ? "scale(0.98)" : isGoogleHovered ? "translateY(-1px)" : "scale(1)",
      outline: "none",
    },
    dividerWrapper: {
      display: "flex",
      alignItems: "center",
      margin: "24px 0",
      color: "#CBD5E1",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      backgroundColor: "#E2E8F0",
    },
    dividerText: {
      fontSize: "12px",
      padding: "0 12px",
      color: colors.textMuted,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      position: "relative",
    },
    labelWrapper: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontSize: "13.5px",
      fontWeight: "500",
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
        ? `1.5px solid ${colors.errorColor}`
        : focusedField === fieldId
        ? `1.5px solid ${colors.borderFocus}`
        : `1.5px solid #E2E8F0`,
      backgroundColor: colors.inputBg,
      fontSize: "14.5px",
      color: "#1E293B",
      outline: "none",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: focusedField === fieldId
        ? `0 0 0 3px rgba(233, 30, 99, 0.12)`
        : errors[fieldId]
        ? `0 0 0 3px rgba(229, 62, 98, 0.1)`
        : "none",
    }),
    passwordToggle: {
      position: "absolute",
      right: "14px",
      background: "none",
      border: "none",
      color: colors.textMuted,
      cursor: "pointer",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      outline: "none",
    },
    errorMessage: {
      fontSize: "12px",
      color: colors.errorColor,
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
    successToast: {
      padding: "16px",
      borderRadius: "16px",
      backgroundColor: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      fontSize: "13.5px",
      lineHeight: "1.5",
      marginTop: "16px",
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      animation: "fadeIn 0.3s ease-out",
    },
    footerLinkText: {
      textAlign: "center",
      marginTop: "24px",
      fontSize: "13.5px",
      color: colors.textMuted,
    },
    footerLink: {
      color: colors.primaryPink,
      textDecoration: "none",
      fontWeight: "600",
      marginLeft: "4px",
      transition: "color 0.2s",
      cursor: "pointer",
    }
  };

  return (
    <div style={styles.container}>
      {/* Decorative Blob */}
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      {/* Main card */}
      <div style={styles.card}>
        
        {/* Header containing brand mascot SVG and Form Titles */}
        <div style={styles.headerWrapper}>
          
          {/* Custom SVG Daifuku Mascot (Wow factor brand identity) */}
          <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "12px" }}>
            {/* Soft Shadow */}
            <ellipse cx="50" cy="74" rx="36" ry="7" fill="#FCE4EC" />
            
            {/* Main Mochi Base */}
            <path d="M12 66C12 48 30 38 50 38C70 38 88 48 88 66C88 74 71 80 50 80C29 80 12 74 12 66Z" fill="#FFFFFF" stroke="#F8BBD0" strokeWidth="3" />
            <path d="M15 66C15 50 31 41 50 41C69 41 85 50 85 66C85 71 70 77 50 77C30 77 15 71 15 66Z" fill="#FFF8FA" />
            
            {/* Blushing cheeks */}
            <circle cx="28" cy="62" r="5" fill="#FF80AB" opacity="0.6" />
            <circle cx="72" cy="62" r="5" fill="#FF80AB" opacity="0.6" />

            {/* Happy Eyes and cute mouth */}
            <path d="M38 56C38 56 40 53 43 55" stroke="#880E4F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M62 56C62 56 60 53 57 55" stroke="#880E4F" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M47 62C47 64 53 64 53 62" stroke="#880E4F" strokeWidth="2" strokeLinecap="round" />

            {/* Strawberry Crown */}
            <path d="M50 16C46 16 38 25 39 36C40 42 44 46 50 46C56 46 60 42 61 36C62 25 54 16 50 16Z" fill="#E91E63" stroke="#C2185B" strokeWidth="2" />
            
            {/* Strawberry Seeds */}
            <circle cx="45" cy="27" r="0.75" fill="#FFEB3B" />
            <circle cx="55" cy="27" r="0.75" fill="#FFEB3B" />
            <circle cx="50" cy="33" r="0.75" fill="#FFEB3B" />
            <circle cx="44" cy="36" r="0.75" fill="#FFEB3B" />
            <circle cx="56" cy="36" r="0.75" fill="#FFEB3B" />
            <circle cx="50" cy="22" r="0.75" fill="#FFEB3B" />
            
            {/* Leaf */}
            <path d="M50 17C48 14 43 15 43 15C43 15 46 20 49 20C51 20 54 15 54 15C54 15 51 14 50 17Z" fill="#4CAF50" />
            <path d="M50 17C50 14 52 13 52 13C52 13 51 16 50 17Z" fill="#388E3C" />
          </svg>

          <h2 style={styles.title}>Daifukumoy Reseller</h2>
          <p style={styles.subtitle}>Gabung kemitraan reseller resmi dan raih keuntungan manis bersama kami.</p>
        </div>

        {/* --- Bagian Atas: Google Sign Up --- */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          onMouseEnter={() => setIsGoogleHovered(true)}
          onMouseLeave={() => {
            setIsGoogleHovered(false);
            setIsGoogleActive(false);
          }}
          onMouseDown={() => setIsGoogleActive(true)}
          onMouseUp={() => setIsGoogleActive(false)}
          style={styles.googleButton}
        >
          {/* Official Google Clean Vector Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Daftar dengan Google
        </button>

        {/* --- Bagian Tengah: Divider --- */}
        <div style={styles.dividerWrapper}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>atau isi manual</span>
          <div style={styles.dividerLine} />
        </div>

        {/* --- Bagian Bawah: Form Pendaftaran Manual --- */}
        <form onSubmit={handleSubmitManual} style={styles.form}>
          
          {/* 1. Field: Nama Lengkap */}
          <div style={styles.inputGroup}>
            <div style={styles.labelWrapper}>
              <label htmlFor="fullName" style={styles.label}>Nama Lengkap</label>
            </div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                {/* User icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan nama lengkap Anda"
                style={styles.input("fullName")}
              />
            </div>
            {errors.fullName && <span style={styles.errorMessage}>{errors.fullName}</span>}
          </div>

          {/* 2. Field: Nomor WhatsApp */}
          <div style={styles.inputGroup}>
            <div style={styles.labelWrapper}>
              <label htmlFor="whatsapp" style={styles.label}>Nomor WhatsApp</label>
            </div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                {/* Phone icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={handleChange}
                onFocus={() => setFocusedField("whatsapp")}
                onBlur={() => setFocusedField(null)}
                placeholder="Contoh: 0812-3456-7890"
                style={styles.input("whatsapp")}
              />
            </div>
            {errors.whatsapp && <span style={styles.errorMessage}>{errors.whatsapp}</span>}
          </div>

          {/* 3. Field: Email */}
          <div style={styles.inputGroup}>
            <div style={styles.labelWrapper}>
              <label htmlFor="email" style={styles.label}>Email</label>
            </div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                {/* Mail icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="nama@email.com"
                style={styles.input("email")}
              />
            </div>
            {errors.email && <span style={styles.errorMessage}>{errors.email}</span>}
          </div>

          {/* 4. Field: Password */}
          <div style={styles.inputGroup}>
            <div style={styles.labelWrapper}>
              <label htmlFor="password" style={styles.label}>Password</label>
            </div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>
                {/* Lock icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan minimal 6 karakter"
                style={styles.input("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={styles.passwordToggle}
              >
                {showPassword ? (
                  /* Eye Off SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span style={styles.errorMessage}>{errors.password}</span>}
          </div>

          {/* Submit Button */}
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
            Daftar Akun
            {/* Arrow right icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          </button>
        </form>

        {/* Elegant Success Banner Inside Form for Wow Factor */}
        {showSuccessToast && (
          <div style={styles.successToast}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            <div>
              <strong style={{ display: "block", marginBottom: "2px", fontWeight: "600" }}>Pendaftaran Siap Diproses!</strong>
              Data pendaftaran Anda telah divalidasi dan dicatat di console log. Sistem siap mentransmisikan data ini ke layanan autentikasi Clerk & database Supabase.
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div style={styles.footerLinkText}>
          Sudah punya akun reseller?
          <a
            href="/login"
            style={styles.footerLink}
          >
            Masuk Sekarang
          </a>
        </div>
      </div>
    </div>
  );
}
