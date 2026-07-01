"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  Package, 
  ShoppingCart, 
  ClipboardCheck,
  Menu,
  X,
  BarChart3,
  ClipboardList,
  FileText,
  Share2,
  PackageOpen,
  Box,
  User,
  ImageIcon
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { preOrders } = useData();
  const { currentUser, logout, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const pendingPOs = useMemo(() => {
    const groups = new Set();
    preOrders.forEach(po => {
      if (po.status === "pesanan diterima") {
        groups.add(`${po.resellerId}_${po.pickupDate}`);
      }
    });
    return groups.size;
  }, [preOrders]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (isLoading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render layout for login page
  if (pathname === "/login" || pathname === "/sign-in" || pathname === "/sign-up" || !currentUser) {
    return <>{children}</>;
  }
  const allNavItems = [
    { name: "Dashboard", href: "/", icon: <LayoutDashboard size={20} />, roles: ["owner", "admin"] },
    { name: "Analitik & Tren", href: "/analytics", icon: <BarChart3 size={20} />, roles: ["owner"] },
    { name: "Kelola PO", href: "/approval", icon: <ClipboardCheck size={20} />, badge: pendingPOs > 0 ? pendingPOs : null, roles: ["admin"] },
    { name: "Stock Global", href: "/global-stock", icon: <Package size={20} />, roles: ["admin"] },
    { name: "Mutasi Stok", href: "/stock-transfer", icon: <Share2 size={20} />, roles: ["admin"] },
    { name: "Manajemen Bahan Baku", href: "/raw-materials", icon: <Box size={20} />, roles: ["admin"] },
    { name: "Perencanaan Produksi", href: "/planning", icon: <ClipboardList size={20} />, roles: ["admin"] },
    { name: "Stock Opname", href: "/stock", icon: <PackageOpen size={20} />, roles: ["admin"] },
    { name: "Keuangan", href: "/keuangan", icon: <Wallet size={20} />, roles: ["admin"] },
    { name: "Laporan Bulanan", href: "/reports", icon: <FileText size={20} />, roles: ["owner", "admin"] },
    { name: "Detail Performa Kanal", href: "/performance", icon: <BarChart3 size={20} />, roles: ["owner", "admin"] },
    { name: "Inventori", href: "/inventory", icon: <Package size={20} />, roles: ["admin"] },
    { name: "Manajemen Kanal", href: "/channels", icon: <Share2 size={20} />, roles: ["admin"] },
    { name: "Manajemen Banner", href: "/banners", icon: <ImageIcon size={20} />, roles: ["admin"] },
    { name: "Katalog Produk", href: "/reseller", icon: <ShoppingCart size={20} />, roles: ["reseller"] },
    { name: "Riwayat PO", href: "/reseller/history", icon: <ClipboardCheck size={20} />, roles: ["reseller"] },
    { name: "Profil Reseller", href: "/profile", icon: <User size={20} />, roles: ["reseller"] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

  const bannerData: Record<string, { icon: React.ReactNode, text: string }> = {
    "/": { icon: <LayoutDashboard size={20} className="shrink-0 text-white" />, text: "Pantau ringkasan performa dan metrik utama bisnis secara real-time." },
    "/analytics": { icon: <BarChart3 size={20} className="shrink-0 text-white" />, text: "Visualisasi data dinamis untuk forecasting dan analisis efisiensi." },
    "/global-stock": { icon: <Package size={20} className="shrink-0 text-white" />, text: "Gudang utama penyimpanan stok sebelum distribusi." },
    "/stock-transfer": { icon: <Share2 size={20} className="shrink-0 text-white" />, text: "Manajemen pengiriman stok dari gudang ke berbagai lokasi." },
    "/planning": { icon: <ClipboardList size={20} className="shrink-0 text-white" />, text: "Tentukan target produksi. Sistem otomatis menghitung rekomendasi berdasar pola penjualan." },
    "/reports": { icon: <FileText size={20} className="shrink-0 text-white" />, text: "Laporan bulanan komprehensif untuk evaluasi laba rugi dan performa kanal." },
    "/keuangan": { icon: <Wallet size={20} className="shrink-0 text-white" />, text: "Kelola arus kas, laba rugi, dan pencatatan keuangan harian dengan mudah." },
    "/inventory": { icon: <Package size={20} className="shrink-0 text-white" />, text: "Manajemen katalog produk master dan penetapan HPP serta harga jual." },
    "/stock": { icon: <PackageOpen size={20} className="shrink-0 text-white" />, text: "Entri data stok awal dan penjualan harian secara efisien." },
    "/performance": { icon: <BarChart3 size={20} className="shrink-0 text-white" />, text: "Analisis performa finansial dan efisiensi produk secara mendetail." },
    "/approval": { icon: <ClipboardCheck size={20} className="shrink-0 text-white" />, text: "Kelola pesanan dan progres Pre-Order (PO) dari agen reseller." },
    "/channels": { icon: <Share2 size={20} className="shrink-0 text-white" />, text: "Kelola jalur distribusi dan titik lokasi penjualan secara dinamis." },
    "/banners": { icon: <ImageIcon size={20} className="shrink-0 text-white" />, text: "Kelola slide promosi (carousel) yang tampil di portal Reseller." },
    "/reseller": { icon: <ShoppingCart size={20} className="shrink-0 text-white" />, text: "Pesan produk Daifukumoy favorit pelangganmu di sini." },
    "/reseller/history": { icon: <ClipboardCheck size={20} className="shrink-0 text-white" />, text: "Pantau status dan riwayat pemesanan yang pernah kamu buat." },
    "/profile": { icon: <User size={20} className="shrink-0 text-white" />, text: "Lengkapi data diri dan WhatsApp Anda untuk mengaktifkan fitur PO & Checkout." },
  };

  const currentBanner = bannerData[pathname];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Backdrop Overlay for Mobile Sidebar */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-50 w-64 transition-all duration-300 ease-in-out transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0 ${isSidebarOpen ? "md:w-64" : "md:w-20"}`}>
        <div className={`h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0`}>
          <div className={`flex items-center gap-2 transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-full" : "md:opacity-0 md:max-w-0 md:hidden"}`}>
            <img src="/logo.png" alt="Daifukumoy Logo" className="h-[30px] w-auto object-contain drop-shadow-sm" />
            <span className="text-xl font-quicksand font-bold text-primary">Daifukumoy</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-lg hover:bg-accent/50 text-secondary md:block hidden"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="p-2 rounded-lg hover:bg-accent/50 text-secondary md:hidden block"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-50 flex items-center gap-3 shrink-0">
          <div className="flex-shrink-0">
            <UserButton />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-full" : "md:opacity-0 md:max-w-0 md:hidden"}`}>
            <p className="font-bold text-gray-800 truncate">{currentUser.name}</p>
            <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
                  isActive ? "bg-primary text-white shadow-md shadow-primary/30" : "text-gray-500 hover:bg-accent/30 hover:text-primary"
                }`}
              >
                {item.icon}
                <span className={`flex-1 font-montserrat font-semibold transition-all duration-300 ${
                  isSidebarOpen ? "opacity-100 max-w-full" : "md:opacity-0 md:max-w-0 md:hidden"
                }`}>
                  {item.name}
                </span>
                {item.badge && (
                  <span className={`bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full transition-all duration-300 ${
                    isSidebarOpen ? "opacity-100" : "md:opacity-0 md:hidden"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={logout}
            className={`w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "md:justify-center justify-start px-4"} py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium`}
          >
            <img src="/logout.png" alt="logout" className={`h-5 w-auto object-contain ${isSidebarOpen ? "mr-3" : "md:mr-0 mr-3"}`} />
            <span className={`transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-full" : "md:opacity-0 md:max-w-0 md:hidden"}`}>
              Keluar
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="min-h-[4rem] bg-primary text-white shadow-md flex items-center justify-between px-4 md:px-6 z-20 py-3 relative overflow-hidden">
          {/* Mascot Image Decorator */}
          <img 
            src="/trio.png" 
            alt="Daifukumoy Mascot Trio" 
            className="absolute top-1/2 -translate-y-1/2 right-6 h-8 md:h-9 w-auto object-contain opacity-95 drop-shadow-md z-0 hidden md:block"
          />

          <div className="flex items-center gap-4 md:gap-6 flex-1 overflow-hidden relative z-10">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-white/20 text-white md:hidden shrink-0"
              aria-label="Open Sidebar"
            >
              <Menu size={24} />
            </button>

            <h1 className="text-xl md:text-2xl font-quicksand font-bold shrink-0 text-white">
              {navItems.find(item => item.href === pathname)?.name || "Dashboard"}
            </h1>
            
            {/* Custom Header Banners */}
            {currentBanner && (
              <div className="hidden md:flex bg-white/20 text-white px-5 py-2.5 rounded-2xl items-center gap-3 flex-1 max-w-2xl animate-in fade-in zoom-in-95 duration-300">
                {currentBanner.icon}
                <p className="text-sm font-medium truncate">
                  {currentBanner.text}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
