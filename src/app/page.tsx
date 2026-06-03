"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { 
  Check, 
  ArrowRight, 
  HelpCircle, 
  Zap, 
  ShieldCheck, 
  Users, 
  Radio, 
  GitBranch, 
  MessageSquare, 
  Brain, 
  ChevronDown,
  Volume2,
  Lock
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const features = [
    { 
      title: "Shared Team Inbox", 
      desc: "Connect one official number and let your entire customer support team respond simultaneously from their own devices.", 
      icon: Users 
    },
    { 
      title: "Meta Cloud API Gateway", 
      desc: "Built directly on the official Meta WhatsApp Business framework to protect your brand from account suspension.", 
      icon: ShieldCheck 
    },
    { 
      title: "AI Voice Transcription", 
      desc: "Our systems automatically convert incoming voice notes into clear, readable text in real-time.", 
      icon: Volume2 
    },
    { 
      title: "Smart Pipeline & Tags", 
      desc: "Organize customer journeys using customized pipelines, tags, and agent ownership controls.", 
      icon: GitBranch 
    },
    { 
      title: "Official Campaign Broadcaster", 
      desc: "Upload customized CSV customer lists to safely broadcast promotional templates using official APIs.", 
      icon: Radio 
    },
    { 
      title: "SaaS Workspace Isolation", 
      desc: "Workspace configurations and private API keys remain strictly hidden from agents. Only owners hold complete access.", 
      icon: Lock 
    },
  ];

  const faqs = [
    {
      q: "Are Meta WhatsApp Cloud API charges included in this plan?",
      a: "No. Meta charges for WhatsApp usage on a per-conversation window basis directly to your connected billing card in Meta Business Suite. Our monthly subscription is strictly for our management CRM software, system hosting, and custom UI features.",
    },
    {
      q: "Do I need to keep my PC or phone online to receive messages?",
      a: "No. amarchat is a fully cloud-hosted platform. Your automated AI chatbot, message sync, and broadcasting queues remain functional 24/7 even if your devices are turned off.",
    },
    {
      q: "Is there any risk of my phone number getting banned?",
      a: "No. Unlike scraper-based extensions or browser-emulated web wrappers, our systems leverage Meta's official Cloud API gateway, ensuring absolute safety for your WhatsApp number.",
    },
    {
      q: "Can I manage permission levels for support agents?",
      a: "Yes. Workspace Owners (is_approved === true) maintain total configuration control. Support agents can only send and receive chats, keeping your API keys and credentials secure.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar />

        {/* 1. HERO SECTION */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {'🇧🇩 Premium BYOA WhatsApp CRM & Automation'}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl mx-auto">
              {'More Leads. Faster Follow-Up. '}
              <span className="text-purple-500">{'More Revenue.'}</span>
            </h1>
            <p className="mt-6 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {'Scale customer support with a Shared Team Inbox, train your custom AI Sales Agent on your own knowledge base, and dispatch official marketing broadcasts safely.'}
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 group active:scale-95">
                {'Start Free Trial'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto px-8 py-4 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all flex items-center justify-center gap-2">
                {'View Pricing'}
              </Link>
            </div>
          </div>

          {/* Hero Dashboard Image Mockup */}
          <div className="pt-16 relative z-10 max-w-5xl mx-auto px-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-2 md:p-3 shadow-2xl shadow-indigo-500/10">
              <div className="rounded-xl border border-zinc-900 overflow-hidden bg-zinc-950 aspect-[16/10] relative">
                <img 
                  src="/hero-dashboard.png" 
                  alt="amarchat Interactive Dashboard Mockup" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. THREE CORE SOLUTIONS SHOWCASE (WITH SCROLL CODES & IMAGES) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-28">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400">
              {'Platform Tour'}
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              {'See the tools that drive '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{'real results'}</span>
            </h2>
            <p className="text-sm md:text-base text-zinc-400">
              {'Discover how our premium Bring Your Own App (BYOA) system enables professional WhatsApp operations without the risk.'}
            </p>
          </div>

          {/* Feature Block 1: Shared Inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/10 bg-purple-500/5 text-xs font-semibold text-purple-400">
                {'Shared Workspace'}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {'One Number. Unlimited Agents.'}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {'Stop passing one phone around. Connect your official WhatsApp number and let your entire customer support team respond simultaneously from their own screens.'}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Real-time agent assignment and conversation ownership.'}</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Shared visibility to prevent double-replies to the same customer.'}</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Status tracking (Open, Pending, Closed) to keep your inbox organized.'}</span>
                </li>
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-2 shadow-xl">
                <div className="rounded-lg border border-zinc-900 overflow-hidden bg-zinc-950 aspect-[3/2]">
                  <img 
                    src="/feature-inbox.png" 
                    alt="Unified Shared Team Inbox" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature Block 2: AI Knowledge Base */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 lg:order-2">
              <div className="lg:pl-6 space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-xs font-semibold text-emerald-400">
                  {'24/7 Automation'}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {'Train Your Custom AI Chatbot'}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {'Let artificial intelligence handle routine queries when your team is offline. Train your AI instantly by copy-pasting your business FAQ data directly into your knowledge base.'}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{'Instant exact context matching database queries for zero latency.'}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{'Flexible integrations with OpenRouter and OpenAI Whisper for voice.'}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{'Smart agent fallback: AI pauses automatically when an agent intervenes.'}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="lg:col-span-5 lg:order-1">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-2 shadow-xl">
                <div className="rounded-lg border border-zinc-900 overflow-hidden bg-zinc-950 aspect-[3/2]">
                  <img 
                    src="/feature-bot.png" 
                    alt="Custom AI Chatbot Knowledge Base Training" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature Block 3: Broadcast campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/10 bg-indigo-500/5 text-xs font-semibold text-indigo-400">
                {'Campaign Delivery'}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {'Official Broadcaster. Zero Ban Risks.'}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {'Reach thousands of contacts directly in their inboxes. Upload your contact files and broadcast approved interactive templates securely without the risk of system blocks.'}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Full alignment with Meta developer API guidelines.'}</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Interactive layouts with customized quick replies and links.'}</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{'Bulk messaging capabilities through your official Cloud API.'}</span>
                </li>
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-2 shadow-xl">
                <div className="rounded-lg border border-zinc-900 overflow-hidden bg-zinc-950 aspect-[3/2]">
                  <img 
                    src="/feature-broadcast.png" 
                    alt="Official WhatsApp Campaign Broadcaster" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. EVERYTHING YOU NEED FEATURE GRID */}
        <section id="features" className="max-w-5xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold text-white">{'Everything you need to automate WhatsApp'}</h2>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">{'All modern customer relationship management tools packed in one dashboard.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div key={i} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-5 space-y-3 hover:border-zinc-800 transition">
                <div className="p-2 bg-zinc-950 rounded-lg w-fit border border-zinc-900">
                  <feat.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h4 className="font-bold text-white text-sm">{feat.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" className="max-w-4xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold text-white">{'How it works'}</h2>
            <p className="text-xs md:text-sm text-zinc-400">{'Launch your custom amarchat platform in three simple steps.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">1</span>
              <h4 className="text-sm font-bold text-white">{'Link Meta API'}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{'Input your custom Phone Number ID and Access Token securely under the Workspace settings.'}</p>
            </div>
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">2</span>
              <h4 className="text-sm font-bold text-white">{'Train AI Knowledge'}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{'Add business descriptions, context, or product lists to power the instant custom AI response builder.'}</p>
            </div>
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">3</span>
              <h4 className="text-sm font-bold text-white">{'Automate & Support'}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{'Let your agents take care of active deals while the AI handles FAQ workflows round-the-clock.'}</p>
            </div>
          </div>
        </section>

        {/* 5. OFFICIAL API SECURITY EXPLANATION (COMPLIANT DESIGN WITH SCREENSHOT-INSPIRED COPY) */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400">
                {'Meta Approved Partner'}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {'Built on the official WhatsApp Cloud API'}
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {'Unlike typical unofficial scrapers and browser automation extensions that easily trigger instant WhatsApp ban-waves, our platform operates 100% on the official Meta Cloud developer gateway.'}
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                    <Check className="h-4 w-4 shrink-0" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{'Complete Safety Commitment'}</h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{'Zero risk of number ban waves under standard promotional guidelines.'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                    <Check className="h-4 w-4 shrink-0" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{'Secure Tenant Isolation'}</h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{'Only Workspace Owners hold credential configurations. Support agents only see conversational text.'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
              <h4 className="font-bold text-white text-sm">{'Why Businesses Choose the BYOA Model'}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {'By letting you Bring Your Own App (BYOA), we cut down excessive middleman markup costs. You only pay amarchat for the premium software interface (৳৯৯৯/month) and keep direct control of your own database configuration.'}
              </p>
              <div className="pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <span className="text-lg font-bold text-indigo-400">{'100%'}</span>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{'Account Control'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-lg font-bold text-indigo-400">{'0%'}</span>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{'Message Markup'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ ACCORDION SECTION */}
        <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-8">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center">{'Frequently Asked Questions'}</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-zinc-900 bg-zinc-900/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-900/40 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="p-5 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 pl-11">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 7. BOTTOM CTA BANNER */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16">
          <div className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950/80 p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] -z-10 pointer-events-none" />
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
              {'Scale Your Customer Support'} <br />
              {'& Automate WhatsApp'}
            </h2>
            <p className="mt-4 text-xs md:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              {'Join professional businesses utilizing the Bring Your Own App (BYOA) model. Get started with our risk-free configuration today.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group">
                {'Start SaaS Pro'} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto px-8 py-3.5 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all">
                {'View Pricing'}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}