import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "amarchat — AI-Powered WhatsApp Automation",
    template: "%s — amarchat",
  },
  description: "Automate your sales, scale support, and send official WhatsApp broadcasts without number bans.",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
  // **১ ক্লিকে গুগল সার্চ কনসোল ভেরিফিকেশন মেটা ট্যাগ ইন্টিগ্রেশন**
  verification: {
    google: "D2P9d0v3EYw_OHKW0v1cnmN0zaRQofryZPXwCPhme4A",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#09090b] text-white font-sans selection:bg-indigo-500/30">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid #27272a",
              color: "white",
            },
          }}
        />
      </body>
    </html>
  );
}