"use client";

import React, { useState, useEffect } from "react";
import { useSignIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const { loaded: isClerkLoaded } = useClerk();
  const { signIn, errors: clerkErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState(1); // 1: Email/Username, 2: Password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [cooldown, setCooldown] = useState(0);

  const isLoaded = isClerkLoaded && signIn !== null;

  // Handle countdown timer for rate limiting
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setErrorMsg("");
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || cooldown > 0) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const { error } = await signIn.password({
        identifier: email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal melakukan sign in. Silakan coba lagi.");
        return;
      }

      if (signIn.status === "complete") {
        if (rememberMe) {
          localStorage.setItem("clerk_remember_me", "true");
          localStorage.setItem("clerk_session_expires_at", (Date.now() + 24 * 60 * 60 * 1000).toString());
        } else {
          localStorage.removeItem("clerk_remember_me");
          localStorage.removeItem("clerk_session_expires_at");
          sessionStorage.setItem("clerk_session_active", "true");
        }

        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else {
        setErrorMsg("Status sign in tidak lengkap: " + signIn.status);
      }
    } catch (err: any) {
      console.error("Clerk sign-in error:", err);
      setErrorMsg("Gagal melakukan sign in. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Watch clerkErrors for rate limiting
  useEffect(() => {
    if (clerkErrors?.raw && Array.isArray(clerkErrors.raw)) {
      const isRateLimit = clerkErrors.raw.some((e: any) => 
        e.code === "rate_limit_exceeded" || 
        e.message?.toLowerCase().includes("too many requests") ||
        e.longMessage?.toLowerCase().includes("too many requests")
      );
      if (isRateLimit) {
        setCooldown(60);
      }
      
      const firstErr = clerkErrors.raw[0] as any;
      if (firstErr) {
        setErrorMsg(firstErr.message || firstErr.longMessage || "Gagal melakukan sign in.");
      }
    }
  }, [clerkErrors]);

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    try {
      if (rememberMe) {
        localStorage.setItem("clerk_remember_me_pending", "true");
      } else {
        localStorage.removeItem("clerk_remember_me_pending");
        sessionStorage.setItem("clerk_session_active", "true");
      }
      
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
      });

      if (error) {
        setErrorMsg(error.message || "Gagal login dengan Google.");
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setErrorMsg("Gagal login dengan Google.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bglogin.png')" }}
    >
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0"></div>
      
      {/* --- Main Sign In Card --- */}
      <div className="w-full max-w-[400px] bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Daifukumoy Logo" className="w-12 h-12 object-contain mb-4" />
          <h1 className="text-[1.25rem] font-bold text-[#111827] mb-1.5 text-center leading-snug">
            {step === 1 ? "Sign in" : "Enter your password"}
          </h1>
          <p className="text-[0.875rem] text-[#6B7280] text-center leading-snug">
            {step === 1 ? "to continue to Daifukumoy" : "Enter the password associated with your account"}
          </p>
        </div>

        {/* User Badge for Step 2 */}
        {step === 2 && (
          <div 
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-1.5 rounded-full text-xs font-semibold text-[#374151] mx-auto mb-6 transition-colors cursor-pointer group border border-gray-100"
          >
            <span>{email}</span>
            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-xs font-medium text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="leading-normal">{errorMsg}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="flex flex-col">
            {/* Google SSO Button */}
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 py-2 px-4 border border-[#E5E7EB] rounded-md font-medium text-sm text-[#374151] hover:bg-gray-50 transition-all cursor-pointer mb-6"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-[1px] bg-[#E5E7EB] flex-1"></div>
              <span className="text-[0.75rem] font-medium text-[#9CA3AF]">or</span>
              <div className="h-[1px] bg-[#E5E7EB] flex-1"></div>
            </div>

            {/* Email/Username Input */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[0.8125rem] font-semibold text-[#111827]">
                Email address or username
              </label>
              <input 
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 border border-[#D1D5DB] rounded-md px-3 text-sm focus:outline-none focus:border-[#ff65c5] transition-colors font-medium text-gray-700"
                placeholder="Enter email address or username"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 mb-6">
              <input 
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#ff65c5] focus:ring-[#ff65c5] accent-[#ff65c5] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-[0.8125rem] font-medium text-[#4B5563] cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Continue Button */}
            <button 
              type="submit"
              disabled={isLoading || fetchStatus === "fetching" || cooldown > 0}
              className={`w-full h-10 text-white rounded-md font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                cooldown > 0 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#ff65c5] hover:bg-[#e04fa7] active:bg-[#c93f92]"
              }`}
            >
              {cooldown > 0 ? `Try again in ${cooldown}s` : "Continue ▸"}
            </button>

            {/* Sign Up Link */}
            <div className="mt-6 text-center text-xs text-gray-500">
              No account? <Link href="/sign-up" className="text-[#ff65c5] hover:underline font-medium">Sign up</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="flex flex-col">
            {/* Password Input */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex justify-between items-center">
                <label className="text-[0.8125rem] font-semibold text-[#111827]">
                  Password
                </label>
                <a href="#" className="text-[0.8125rem] font-semibold text-[#ff65c5] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-10 border border-[#D1D5DB] rounded-md pl-3 pr-10 text-sm focus:outline-none focus:border-[#ff65c5] transition-colors font-medium text-gray-700"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 mb-6">
              <input 
                type="checkbox"
                id="rememberMe2"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#ff65c5] focus:ring-[#ff65c5] accent-[#ff65c5] cursor-pointer"
              />
              <label htmlFor="rememberMe2" className="text-[0.8125rem] font-medium text-[#4B5563] cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Continue Button */}
            <button 
              type="submit"
              disabled={isLoading || fetchStatus === "fetching" || cooldown > 0}
              className={`w-full h-10 text-white rounded-md font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                cooldown > 0 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#ff65c5] hover:bg-[#e04fa7] active:bg-[#c93f92]"
              }`}
            >
              {cooldown > 0 ? `Try again in ${cooldown}s` : "Continue ▸"}
            </button>

            {/* Back Link */}
            <div className="mt-6 text-center text-xs text-gray-500">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-[#ff65c5] hover:underline font-medium cursor-pointer"
              >
                Use another method
              </button>
            </div>
          </form>
        )}



      </div>

    </div>
  );
}
