import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import Script from "next/script"; // নেক্সট জেএস অফিশিয়াল স্ক্রিপ্ট কম্পোনেন্ট
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
  // ১ ক্লিকে গুগল সার্চ কনসোল ভেরিফিকেশন মেটা ট্যাগ ইন্টিগ্রেশন
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
      <body className="min-h-full bg-[#09090b] text-white font-sans selection:bg-indigo-500/30 pb-16">
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

        {/* ==================== amarchat Floating WhatsApp Widget ==================== */}
        <div 
          id="amarchat-wa-widget" 
          style={{
            position: "fixed",
            bottom: "25px",
            right: "25px",
            zIndex: 999999,
            fontFamily: "'Segoe UI', Arial, sans-serif"
          }}
        >
          {/* Floating WhatsApp Button */}
          <button 
            id="amarchat-wa-btn" 
            style={{
              backgroundColor: "#7c3aed",
              color: "white",
              border: "none",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              outline: "none"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="white" className="w-7 h-7">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L32 503l139.7-36.6c32.7 17.8 69.3 27.2 106.7 27.2 122.4 0 222-99.6 222-222 0-59.3-23.2-115-65.1-157.0zM223.9 445.2c-33.2 0-65.8-8.9-93.9-25.7l-6.7-4-82.8 21.7 22.1-80.7-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.3-3.2 0-6.9-.5-10.6-.5-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 30.7 94.8 53.8 55.8 23 55.8 15.3 65.9 14.4 10.2-.9 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
            </svg>
          </button>

          {/* Custom WhatsApp Chat Popup */}
          <div 
            id="amarchat-wa-popup" 
            style={{
              display: "none",
              position: "absolute",
              bottom: "75px",
              right: 0,
              width: "320px",
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              transition: "all 0.3s ease"
            }}
          >
            {/* Popup Header */}
            <div style={{ backgroundColor: "#1e1b4b", padding: "18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #7c3aed" }}>
              <div style={{ width: "40px", height: "40px", backgroundColor: "#7c3aed", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", position: "relative", fontSize: "14px" }}>
                {"AC"}
                <span style={{ position: "absolute", bottom: "1px", right: "1px", width: "10px", height: "10px", backgroundColor: "#00a884", borderRadius: "50%", border: "2px solid #1e1b4b" }}></span>
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "white", fontWeight: "bold" }}>amarchat Support</h4>
                <span style={{ fontSize: "11px", color: "#a78bfa", fontWeight: 500 }}>AI Support Agent (online)</span>
              </div>
            </div>
            {/* Popup Body */}
            <div style={{ padding: "20px", backgroundColor: "#0b0f19" }}>
              <p style={{ margin: "0 0 18px 0", fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, textAlign: "left" }}>
                {"আসসালামু আলাইকুম সম্মানিত গ্রাহক! আমাদের অফিশিয়াল হোয়াটসঅ্যাপ অটোমেশন ও AI ড্যাশবোর্ডে আপনাকে স্বাগতম। আমরা কীভাবে আপনাকে সাহায্য করতে পারি?"}
              </p>
              <a 
                id="amarchat-wa-link" 
                href="https://wa.me/8801682102557?text=Hello%20amarchat%20Support!%20I%20want%20to%20know%20more%20about%20your%20WhatsApp%20SaaS%20plans." 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "#00a884", color: "white", textDecoration: "none", padding: "11px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", outline: "none" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="white" className="w-4 h-4">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L32 503l139.7-36.6c32.7 17.8 69.3 27.2 106.7 27.2 122.4 0 222-99.6 222-222 0-59.3-23.2-115-65.1-157.0zM223.9 445.2c-33.2 0-65.8-8.9-93.9-25.7l-6.7-4-82.8 21.7 22.1-80.7-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.3-3.2 0-6.9-.5-10.6-.5-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 30.7 94.8 53.8 55.8 23 55.8 15.3 65.9 14.4 10.2-.9 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                </svg>
                {"চ্যাট শুরু করুন"}
              </a>
            </div>
          </div>
        </div>

        {/* নেক্সট জেএস-এর জন্য রেন্ডারিং-সেফ ডাইনামিক স্ক্রিপ্ট লোডার */}
        <Script id="amarchat-wa-widget-script" strategy="afterInteractive">
          {`
            (function() {
              var btn = document.getElementById('amarchat-wa-btn');
              var popup = document.getElementById('amarchat-wa-popup');
              if (!btn || !popup) return;
              
              btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (popup.style.display === 'none' || popup.style.display === '') {
                  popup.style.display = 'block';
                  btn.style.transform = 'scale(0.9)';
                  setTimeout(function() { btn.style.transform = 'scale(1)'; }, 150);
                } else {
                  popup.style.display = 'none';
                }
              });

              document.addEventListener('click', function(e) {
                if (popup.style.display === 'block') {
                  popup.style.display = 'none';
                }
              });

              popup.addEventListener('click', function(e) {
                e.stopPropagation();
              });
            })();
          `}
        </Script>
      </body>
    </html>
  );
}