import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WebGIS Tangerang — AI-Powered Cadastral Dashboard",
  description:
    "Autonomous WebGIS application for Kota Tangerang cadastral data with AI-powered spatial queries, real-time map updates, and interactive analytics.",
  keywords: ["WebGIS", "Tangerang", "Cadastral", "PostGIS", "AI", "MapLibre"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}
      >
        {children}
      </body>
    </html>
  );
}
