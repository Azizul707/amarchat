"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Settings,
  LogOut,
  User,
  X,
  Brain,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();

  // Route পরিবর্তন হলে মোবাইল ড্রয়ার অটোমেটিক বন্ধ হবে
  useEffect(() => {
    onClose?.();
  }, [pathname, onClose]);

  // মোবাইল ড্রয়ার ওপেন থাকা অবস্থায় বডি স্ক্রল লক
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // টাইপস্ক্রিপ্ট কম্পাইলেশন এরর (TS2339) এড়াতে এক্সপ্লিসিট টাইপ কাস্টিং সেভগার্ড
  const isOwner = !!(profile as { is_approved?: boolean | null })?.is_approved;

  return (
    <>
      {/* Backdrop (মোবাইলের জন্য ব্যাকড্রপ ব্লার) */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          // ChatSyncs ডার্ক লাক্সারি লাউঞ্জ থিম
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-900 bg-slate-950",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-60 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Primary"
      >
        {/* Logo row (amar - chat স্প্লিট রিব্র্যান্ডেড লোগো) */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-900 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 shadow-sm shadow-violet-500/25 border border-violet-500/30">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight leading-none">
                <span className="text-white">amar</span><span className="text-purple-500">chat</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase leading-none mt-1">
                WhatsApp CRM
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation (ক্যাটাগরি ভিত্তিক গ্রুপড লিস্ট) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          
          {/* CATEGORY 1: CORE */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 block">
              Core
            </span>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/dashboard"
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/inbox"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/inbox")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="flex-1">Inbox</span>
                  {totalUnread > 0 && (
                    <span
                      aria-label={`${totalUnread} unread conversation`}
                      className="relative flex h-2 w-2"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/contacts")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span>Contacts</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/pipelines"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/pipelines")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Pipelines</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CATEGORY 2: MARKETING */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 block">
              Marketing
            </span>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/broadcasts"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/broadcasts")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <Radio className="h-4 w-4" />
                  <span>Broadcasts</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CATEGORY 3: AI & AUTOMATION */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 block">
              AI & Automation
            </span>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/automations"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/automations")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <Zap className="h-4 w-4" />
                  <span>Automations</span>
                </Link>
              </li>
              {isOwner && (
                <li>
                  <Link
                    href="/settings?tab=kb"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith("/settings") && pathname.includes("tab=kb")
                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                    )}
                  >
                    <Brain className="h-4 w-4" />
                    <span>AI Training</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* CATEGORY 4: MANAGEMENT */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 block">
              Management
            </span>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/settings") && !pathname.includes("tab=kb")
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </div>

        </nav>

        {/* User section (রিসেন্টলি আপডেট হওয়া প্রফেশনাল ADMIN/AGENT প্রোফাইল কার্ড) */}
        <div className="shrink-0 border-t border-slate-900 p-3 bg-slate-950">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-900/60 focus:bg-slate-900/60 focus:outline-none focus:ring-0">
              <Avatar className="size-8 shrink-0 border border-slate-800">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-violet-500/10 text-sm font-medium text-violet-400">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-white leading-none">
                    {profile?.full_name ?? "User"}
                  </p>
                  
                  {/* কাস্টম সিকিউরড ওনার ব্যাজ (ADMIN/AGENT) */}
                  {isOwner ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 leading-none">
                      ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400 border border-slate-750 leading-none">
                      AGENT
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500 mt-1 leading-none">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-slate-950 text-slate-100 ring-slate-800 border border-slate-900"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-slate-200 focus:bg-slate-900 focus:text-white"
                  />
                }
              >
                <User className="size-4 text-slate-400" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-slate-200 focus:bg-slate-900 focus:text-white"
                  />
                }
              >
                <Settings className="size-4 text-slate-400" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-900" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-slate-200 focus:bg-slate-900 focus:text-white cursor-pointer"
              >
                <LogOut className="size-4 text-slate-400" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}