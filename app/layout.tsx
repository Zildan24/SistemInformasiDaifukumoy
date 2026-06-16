import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";
import { Quicksand, Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { DataProvider } from "./context/DataContext";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Daifukumoy Management System",
  description: "Prototipe Manajemen Bisnis Daifukumoy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${quicksand.variable} ${montserrat.variable} ${inter.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="beforeInteractive" />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#FF65C5',
              borderRadius: '1rem',
              colorBackground: '#ffffff',
            },
            options: {
              logoImageUrl: '/logo.png',
              socialButtonsVariant: 'auto',
            },
            elements: {
              cardBox: "shadow-2xl border border-pink-100 rounded-[2rem]",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/30",
              headerTitle: "text-2xl font-black text-gray-800 tracking-tight font-sans",
              headerSubtitle: "text-gray-500 font-medium font-sans",
              formFieldLabel: "font-bold text-gray-700 font-sans",
              formFieldInput: "rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20",
              socialButtonsBlockButton: "rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-bold",
              footerActionLink: "text-primary hover:text-primary/80 font-bold",
              identityPreviewEditButton: "text-primary hover:text-primary/80",
            }
          }}
        >
          <AuthProvider>
          <DataProvider>
          <AppLayout>
          {children}
          </AppLayout>
          </DataProvider>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}