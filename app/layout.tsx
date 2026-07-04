import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swacana — AI-Powered Decision Intelligence",
  description: "Local-first AI life management with decision trees, causal analysis, and real-time collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%238b5cf6'/><text x='16' y='22' font-size='18' text-anchor='middle' fill='white' font-weight='bold'>S</text></svg>" />
      </head>
      <body className="h-full bg-[#0a0a0f] text-[#e8e8ed]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
