"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/services", label: "Services" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled
          ? "bg-slate-950/85 backdrop-blur-md border-slate-900 shadow-lg shadow-black/35"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* রিব্র্যান্ডেড স্প্লিট লোগো */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 shadow-sm shadow-purple-600/25 border border-purple-500/30">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight leading-none text-white">
            amar<span className="text-purple-500">chat</span>
          </span>
        </Link>

        {/* ডেক্সটপ নেভিগেশন মেনু */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs font-semibold tracking-wide transition-colors hover:text-white",
                  isActive ? "text-purple-400" : "text-zinc-400"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ডান পাশের অ্যাক্টিভ বাটন */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login"
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/25"
          >
            Get Started Free
          </Link>
        </div>

        {/* মোবাইল হ্যামবার্গার বাটন */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* মোবাইল ড্রয়ার মেনু */}
      {isOpen && (
        <div className="md:hidden border-b border-zinc-900 bg-zinc-950 px-4 py-6 space-y-4">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-zinc-900 pt-4 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-lg text-center text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-lg text-center text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-md"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}