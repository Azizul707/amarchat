"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* কলাম ১: ব্রোশিওর ও ব্র্যান্ড ডেসক্রিপশন */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 border border-purple-500/30">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white">
              amar<span className="text-purple-500">chat</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500 leading-relaxed">
            বাংলাদেশের অগ্রগামী ই-কমার্স ও এফ-কমার্স উদ্যোক্তাদের জন্য মেটা অফিশিয়াল ক্লাউড এপিআই সমর্থিত অল-ইন-ওয়ান হোয়াটসঅ্যাপ সিআরএম প্ল্যাটফর্ম।
          </p>
        </div>

        {/* কলাম ২: প্রোডাক্ট লিংক */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link href="/services" className="hover:text-white transition-colors">Services</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing Plan</Link></li>
          </ul>
        </div>

        {/* কলাম ৩: রিসোর্স ও টেকনিক্যাল হেল্প */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><a href="https://t.me/aamarchat" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram Helpdesk</a></li>
            <li><a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Meta API Docs</a></li>
            <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
          </ul>
        </div>

        {/* কলাম ৪: লিগ্যাল প্রটেকশন */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li><span className="text-slate-600">About Us</span></li>
            <li><span className="text-slate-600">Privacy Policy</span></li>
            <li><span className="text-slate-600">Terms of Service</span></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <span>&copy; 2026 amarchat. All rights reserved.</span>
        <span>Made with ❤️ for Local Brands in Bangladesh</span>
      </div>
    </footer>
  );
}