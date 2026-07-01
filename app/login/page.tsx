"use client";

import React, { useState } from "react";
import { useAuth, Role } from "../context/AuthContext";
import { UserCircle, ShieldAlert, Store, User, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "quick">("login");
  const [loginInput, setLoginInput] = useState("");

  const handleLogin = (role: Role) => {
    login(role);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bglogin.png')" }}
    >
      
      {/* --- Main Login Card --- */}
      <div className="w-full max-w-md bg-white rounded-[50px] shadow-[0_20px_50px_rgba(255,101,197,0.15)] border-8 border-white p-10 relative z-10 animate-in fade-in zoom-in-95 duration-700 text-center">
        
        {/* Header Section */}
        <div className="mb-8">
          <img src="/logo.png" alt="Daifukumoy Logo" className="w-28 h-28 mx-auto object-contain drop-shadow-md mb-2" />
          <h1 className="text-4xl font-black text-[#9B2C2C] tracking-tight">DAIFUKUMOY</h1>
          <p className="text-gray-400 font-bold text-sm mt-1">Mochi Slime Login</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#FFF5F8] p-1.5 rounded-full mb-8 border border-pink-100">
          <button 
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2.5 rounded-full text-xs font-extrabold transition-all ${activeTab === "login" ? "bg-white text-[#9B2C2C] shadow-md" : "text-gray-400"}`}
          >
            SIMULASI LOGIN
          </button>
          <button 
            onClick={() => setActiveTab("quick")}
            className={`flex-1 py-2.5 rounded-full text-xs font-extrabold transition-all ${activeTab === "quick" ? "bg-white text-[#9B2C2C] shadow-md" : "text-gray-400"}`}
          >
            AKSES CEPAT
          </button>
        </div>

        {activeTab === "login" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Input Fields */}
            <div className="space-y-3">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 group-focus-within:text-[#9B2C2C] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Username (Ketik nama yang didaftarkan)"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full bg-[#FFF9FB] border-2 border-pink-50 rounded-full py-4 pl-12 pr-4 focus:bg-white focus:border-pink-200 outline-none transition-all font-bold text-gray-700 placeholder:text-pink-200"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 group-focus-within:text-[#9B2C2C] transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Password"
                  className="w-full bg-[#FFF9FB] border-2 border-pink-50 rounded-full py-4 pl-12 pr-4 focus:bg-white focus:border-pink-200 outline-none transition-all font-bold text-gray-700 placeholder:text-pink-200"
                />
              </div>
            </div>

            {/* Main Action Button */}
            <button 
              onClick={() => handleLogin((loginInput as Role) || "owner")}
              className="w-full py-4 bg-[#9B2C2C] hover:bg-[#822424] text-white rounded-full font-black text-lg shadow-lg shadow-[#9B2C2C]/30 transition-all transform active:scale-95 mt-4"
            >
              Masuk ke Dunia Mochi
            </button>

            {/* Links */}
            <div className="flex flex-col gap-2 text-xs font-bold mt-4">
              <a href="#" className="text-gray-400 hover:text-[#9B2C2C] transition-colors">Lupa Password?</a>
              <p className="text-gray-400">Belum punya akun? <a href="/register" className="text-[#9B2C2C] hover:underline">Daftar!</a></p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => handleLogin("owner")}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-[#FFF5F8] border-2 border-transparent hover:border-pink-200 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                <UserCircle size={28} />
              </div>
              <div className="text-left">
                <p className="font-black text-[#9B2C2C]">Owner Account</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dashboard & Analisis</p>
              </div>
            </button>

            <button 
              onClick={() => handleLogin("admin")}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-[#F0F7FF] border-2 border-transparent hover:border-blue-100 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                <ShieldAlert size={28} />
              </div>
              <div className="text-left">
                <p className="font-black text-blue-800">Admin Account</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Keuangan & Stok</p>
              </div>
            </button>

            <button 
              onClick={() => handleLogin("reseller")}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-[#F0FFF4] border-2 border-transparent hover:border-green-100 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm group-hover:scale-110 transition-transform">
                <Store size={28} />
              </div>
              <div className="text-left">
                <p className="font-black text-green-800">Reseller Resmi</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Katalog & Order PO</p>
              </div>
            </button>
          </div>
        )}

        {/* Google Login Footer */}
        <div className="mt-8 pt-6 border-t border-gray-50">
          <button className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-100 rounded-full font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <LogIn size={18} className="text-pink-400" />
            Masuk dengan Google
          </button>
        </div>

      </div>

      {/* Decorative Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-100/20 rounded-full blur-3xl -ml-40 -mb-40"></div>
    </div>
  );
}


