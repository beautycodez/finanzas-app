import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { DateFilterProvider } from "@/lib/dateFilter";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import FloatingAddButton from "@/components/FloatingAddButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mis Finanzas",
  description: "Panel de control de finanzas personales",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <AuthProvider>
          <DateFilterProvider>
            <AuthGuard>
              <Navbar />
              <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
                {children}
              </main>
              <FloatingAddButton />
            </AuthGuard>
          </DateFilterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
