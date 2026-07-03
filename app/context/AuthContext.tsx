"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../supabaseClient";
import { useUser, useClerk } from "@clerk/nextjs";

export type Role = "owner" | "admin" | "reseller";

export type User = {
  id: string;
  name: string;
  role: Role;
  phone_number?: string | null;
  email?: string;
};

type AuthContextType = {
  currentUser: User | null;
  isProfileComplete: boolean;
  isLoading: boolean;
  login: (identifier: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  setIsProfileComplete: (status: boolean) => void;
  setCurrentUser: (user: User | null) => void;
  registerUser: (formData: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    setIsMounted(true);
    
    const syncClerkSession = async () => {
      if (!isLoaded) return; // Tunggu Clerk memuat sesi

      if (clerkUser) {
        // Sync pending Google OAuth rememberMe state if any
        const pendingRemember = localStorage.getItem("clerk_remember_me_pending");
        if (pendingRemember === "true") {
          localStorage.removeItem("clerk_remember_me_pending");
          localStorage.setItem("clerk_remember_me", "true");
          localStorage.setItem("clerk_session_expires_at", (Date.now() + 24 * 60 * 60 * 1000).toString());
        }

        // Check session expiration policy for Clerk
        const isClerkRememberMe = localStorage.getItem("clerk_remember_me") === "true";
        let shouldSignOutClerk = false;

        if (isClerkRememberMe) {
          const expiresAt = localStorage.getItem("clerk_session_expires_at");
          if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
            shouldSignOutClerk = true;
          }
        } else {
          // If rememberMe was not checked, session expires when the browser/tab is closed.
          // We check sessionStorage for clerk_session_active.
          const isActive = sessionStorage.getItem("clerk_session_active") === "true";
          if (!isActive) {
            shouldSignOutClerk = true;
          }
        }

        if (shouldSignOutClerk) {
          localStorage.removeItem("clerk_remember_me");
          localStorage.removeItem("clerk_session_expires_at");
          sessionStorage.removeItem("clerk_session_active");
          await signOut();
          router.push("/sign-in");
          setIsLoading(false);
          return;
        }

        // Otherwise, mark the session as active in sessionStorage if not in rememberMe mode (so it persists for this browser session)
        if (!isClerkRememberMe) {
          sessionStorage.setItem("clerk_session_active", "true");
        }

        let dbUserObj = currentUser;
        let dbProfileComplete = isProfileComplete;
        let needToFetch = true;

        if (currentUser && currentUser.email === clerkUser.primaryEmailAddress?.emailAddress) {
          needToFetch = false;
        }

        if (needToFetch) {
          // Coba cari data di tabel users Supabase berdasarkan id Clerk
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkUser.id)
            .single();

          if (userData && !error) {
             // User sudah ada di database
             dbUserObj = {
               id: userData.id,
               name: userData.name,
               role: userData.role as Role,
               phone_number: userData.phone_number,
               email: clerkUser.primaryEmailAddress?.emailAddress
             };
             dbProfileComplete = !!userData.phone_number;
          } else {
             // Auto Insert untuk user baru yang mendaftar via Clerk
             const fullName = clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress || "New User";
             const newRole = "reseller";

             // PENTING: Kita menggunakan crypto.randomUUID() untuk `id` (uuid) 
             // dan menyimpan ID Clerk di kolom `clerk_id`
             const newUuid = crypto.randomUUID();
             const { error: insertError } = await supabase.from('users').insert([{
               id: newUuid,
               clerk_id: clerkUser.id,
               name: fullName,
               phone_number: null,
               role: newRole
             }]);

             if (insertError) {
               console.error("Gagal auto-insert data dari Clerk ke Supabase:", insertError);
             } else {
               dbUserObj = {
                 id: newUuid,
                 name: fullName,
                 role: newRole,
                 phone_number: null,
                 email: clerkUser.primaryEmailAddress?.emailAddress
               };
               dbProfileComplete = false; // Nomor WhatsApp masih kosong
             }
          }
        }

        if (dbUserObj) {
           setCurrentUser(dbUserObj);
           setIsProfileComplete(dbProfileComplete);
           
           // Role-based routing
           const roleLower = dbUserObj.role.toLowerCase();
           let isRedirecting = false;
           if (pathname === "/" || pathname === "/login" || pathname === "/sign-in" || pathname === "/sign-up") {
              if (roleLower === "admin" && pathname !== "/") { router.push("/"); isRedirecting = true; }
              else if (roleLower === "owner" && pathname !== "/") { router.push("/"); isRedirecting = true; }
              else if (roleLower === "reseller") { router.push("/reseller"); isRedirecting = true; }
           }
           
           if (!isRedirecting) {
             setIsLoading(false);
           }
        } else {
           setIsLoading(false);
        }
      } else {
        // Jika tidak login via Clerk, jalankan fallback manual
        let savedUser = localStorage.getItem("daifukumoy_user");
        let parsed = null;
        if (savedUser) {
          try {
            parsed = JSON.parse(savedUser);
            if (parsed && parsed.expires_at && Date.now() > parsed.expires_at) {
              localStorage.removeItem("daifukumoy_user");
              parsed = null;
            }
          } catch (e) {
            localStorage.removeItem("daifukumoy_user");
          }
        }

        if (!parsed) {
          const sessionUser = sessionStorage.getItem("daifukumoy_user");
          if (sessionUser) {
            try {
              parsed = JSON.parse(sessionUser);
              if (parsed && parsed.expires_at && Date.now() > parsed.expires_at) {
                sessionStorage.removeItem("daifukumoy_user");
                parsed = null;
              }
            } catch (e) {
              sessionStorage.removeItem("daifukumoy_user");
            }
          }
        }

        let fallbackRedirecting = false;
        if (parsed) {
          setCurrentUser(parsed);
          setIsProfileComplete(!!parsed.phone_number);
          
          const roleLower = parsed.role.toLowerCase();
          if (pathname === "/" || pathname === "/login" || pathname === "/sign-in" || pathname === "/sign-up") {
              if (roleLower === "admin" && pathname !== "/") { router.push("/"); fallbackRedirecting = true; }
              else if (roleLower === "owner" && pathname !== "/") { router.push("/"); fallbackRedirecting = true; }
              else if (roleLower === "reseller") { router.push("/reseller"); fallbackRedirecting = true; }
          }
        } else if (!["/profile", "/login", "/sso-callback"].includes(pathname) && !pathname.startsWith("/sign-in") && !pathname.startsWith("/sign-up") && !pathname.startsWith("/sso-callback")) {
          // Hanya pindahkan ke /sign-in jika belum ada clerkUser & bukan di route publik
          router.push("/sign-in");
          fallbackRedirecting = true;
        }
        
        if (!fallbackRedirecting) {
          setIsLoading(false);
        }
      }
    };

    syncClerkSession();
  }, [clerkUser, isLoaded, pathname, router]);

  const login = async (identifier: string, rememberMe?: boolean) => {
    // Fungsi simulasi manual lama
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .ilike('name', identifier)
      .limit(1)
      .single();

    let user: User;

    if (dbUser && !error) {
      user = {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role as Role,
        phone_number: dbUser.phone_number
      };
    } else {
      if (identifier === "owner") user = { id: "o1", name: "Ibu Owner", role: "owner", phone_number: "08123456789" };
      else if (identifier === "admin") user = { id: "a1", name: "Budi Admin", role: "admin", phone_number: "08198765432" };
      else if (identifier === "reseller") user = { id: "r1", name: "Siti Reseller", role: "reseller", phone_number: null };
      else {
        alert("Akun tidak ditemukan!");
        return;
      }
    }

    // Set expiration to 24 hours from now
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const userWithExpiry = { ...user, expires_at: expiresAt };

    setCurrentUser(user);
    setIsProfileComplete(!!user.phone_number);
    
    if (rememberMe) {
      localStorage.setItem("daifukumoy_user", JSON.stringify(userWithExpiry));
      sessionStorage.removeItem("daifukumoy_user");
    } else {
      sessionStorage.setItem("daifukumoy_user", JSON.stringify(userWithExpiry));
      localStorage.removeItem("daifukumoy_user");
    }
    
    const roleLower = user.role.toLowerCase();
    if (roleLower === "owner") router.push("/");
    else if (roleLower === "admin") router.push("/");
    else if (roleLower === "reseller") router.push("/reseller");
    else router.push("/");
  };

  const logout = async () => {
    if (clerkUser) {
      await signOut();
    } else {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setIsProfileComplete(true);
    localStorage.removeItem("daifukumoy_user");
    sessionStorage.removeItem("daifukumoy_user");
    localStorage.removeItem("clerk_remember_me");
    localStorage.removeItem("clerk_session_expires_at");
    sessionStorage.removeItem("clerk_session_active");
    router.push("/sign-in");
  };

  const registerUser = async (formData: any) => {
    alert("Fungsi pendaftaran lokal dimatikan karena sudah menggunakan Clerk!");
  };

  return (
    <AuthContext.Provider value={{ currentUser, isProfileComplete, isLoading, login, logout, setIsProfileComplete, setCurrentUser, registerUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
