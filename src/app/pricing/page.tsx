"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Check, X, HelpCircle, ArrowRight, ChevronDown } from 'lucide-react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const comparisonFeatures = [
    // The Platform Features
    { name: "Shared Team Inbox & Pipelines", pro: "included", dfy: "included", section: "platform" },
    { name: "Bulk Campaign Broadcaster", pro: "included", dfy: "included", section: "platform" },
    { name: "AI Training & Prompt Builder", pro: "included", dfy: "included", section: "platform" },
    { name: "0% Message Cost Markup", pro: "included", dfy: "included", section: "platform" },
    { name: "Unlimited Customer Agents", pro: "included", dfy: "included", section: "platform" },
    
    // Setup & Onboarding
    { name: "Meta Developer Configuration", pro: "DIY", dfy: "handled", section: "setup" },
    { name: "AI Chatbot Knowledge Training", pro: "DIY", dfy: "handled", section: "setup" },
    { name: "Template Copywriting & Approval", pro: "DIY", dfy: "handled", section: "setup" },
    { name: "Support Staff Live Onboarding", pro: "DIY", dfy: "handled", section: "setup" },
    
    // Support & Strategy
    { name: "Priority Support Channels", pro: "included", dfy: "included", section: "support" },
    { name: "Dedicated Account Manager", pro: "not_included", dfy: "included", section: "support" },
    { name: "Number Deliverability Checks", pro: "not_included", dfy: "included", section: "support" },
  ];

  const faqs = [
    {
      q: "Are Meta WhatsApp Cloud API charges included in these plans?",
      a: "No. Meta charges for WhatsApp conversations directly to the payment card connected to your Meta Business Suite. amarchat charges absolutely 0% markup on Meta's official API conversation charges."
    },
    {
      q: "Do I need to keep my PC or phone online to run the system?",
      a: "No. amarchat is a cloud platform. Your automated AI chatbot replies, workflows, and campaign broadcasts run 24/7 in the cloud even if your devices are turned off."
    },
    {
      q: "Is there any risk of my WhatsApp number getting banned?",
      a: "Not with us. Because our CRM operates 100% on Meta's official Cloud API gateway, there is zero risk of account bans compared to unofficial extensions."
    },
    {
      q: "Can I downgrade from the Managed plan to Self-Service later?",
      a: "Absolutely. Once our experts fully set up your WhatsApp CRM, train your AI chatbot, and structure your campaigns, you can easily switch to the ৳999/month DIY plan and manage it yourself."
    }
  ];

  const renderCell = (status: string) => {
    if (status === "included") {
      return <Check className="h-4 w-4 text-emerald-500 mx-auto" />;
    }
    if (status === "not_included") {
      return <X className="h-4 w-4 text-zinc-700 mx-auto" />;
    }
    if (status === "DIY") {
      return (
        <span className="inline-flex px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded mx-auto">
          {'DIY'}
        </span>
      );
    }
    if (status === "handled") {
      return (
        <span className="inline-flex px-2 py-0.5 text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded mx-auto">
          {'Handled'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar />

        {/* 1. HERO HEADER */}
        <section className="relative pt-24 pb-12 md:pt-36 md:pb-16 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-4">
            <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-full uppercase tracking-wider">
              {'Pricing & Packages'}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {'One platform. '} <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{'Two ways to get started.'}</span>
            </h1>
            <p className="text-zinc-400 max-w-xl mx-auto text-xs md:text-sm leading-relaxed">
              {'Every plan utilizes your own official WhatsApp API account. The only difference is how much setup help you need on day one.'}
            </p>
          </div>
        </section>

        {/* 2. TWO PLAN CARDS */}
        <section className="max-w-4xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          
          {/* Plan 1: SaaS Pro (DIY) */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-800 transition">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{'SELECT A PLAN'}</span>
                <h3 className="text-2xl font-bold text-white">{'SaaS Pro'}</h3>
                <p className="text-xs text-zinc-400">{'Full control. You configure and run it yourself.'}</p>
              </div>

              <div className="py-2 border-t border-b border-zinc-900 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">{'৳999'}</span>
                <span className="text-xs text-zinc-500 ml-1">{'/month'}</span>
              </div>

              <ul className="space-y-3.5 text-xs text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Full access to all CRM software tools'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Shared Team Inbox & Pipelines'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Bulk broadcasting & scheduling'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'AI assistant configuration tools (DIY)'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Standard WhatsApp support'}</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link href="/signup" className="w-full py-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800">
                {'Get Started'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Plan 2: DFY Elite (Managed Setup) */}
          <div className="rounded-2xl border-2 border-indigo-500 bg-zinc-900/20 p-6 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
              {'RECOMMENDED'}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{'DONE FOR YOU'}</span>
                <h3 className="text-2xl font-bold text-white">{'DFY Elite'}</h3>
                <p className="text-xs text-zinc-400">{'We set it up. We train your AI. We write your templates.'}</p>
              </div>

              <div className="py-2 border-t border-b border-zinc-900 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">{'৳9,999'}</span>
                <span className="text-xs text-zinc-500 ml-1">{'/month'}</span>
              </div>

              <ul className="space-y-3.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Includes premium SaaS Pro tools'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Complete Meta developer setup'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Custom AI Chatbot trained for you'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Copywriting for campaign templates'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{'Live onboarding training session'}</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link href="https://wa.me/your-whatsapp-number" target="_blank" className="w-full py-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
                {'Book Setup Call'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </section>

        {/* 3. DETAILED COMPARISON TABLE */}
        <section className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{'Compare Plans & Features'}</h2>
            <p className="text-xs text-zinc-400">{'A transparent look at how our self-service and managed plans differ.'}</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-900 bg-zinc-900/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-300 font-semibold">
                  <th className="p-4 w-[40%]">{'Features & Setup'}</th>
                  <th className="p-4 text-center">{'SaaS Pro'}</th>
                  <th className="p-4 text-center bg-indigo-500/5 text-indigo-300">{'DFY Elite'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 text-zinc-400">
                {/* Section Header: The Platform */}
                <tr className="bg-zinc-900/20">
                  <td colSpan={3} className="p-3 text-[10px] font-bold uppercase tracking-wider text-indigo-400 pl-4">
                    {'THE PLATFORM TOOLS'}
                  </td>
                </tr>
                {comparisonFeatures
                  .filter((f) => f.section === "platform")
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-900/20 transition">
                      <td className="p-4 font-semibold text-zinc-200">{row.name}</td>
                      <td className="p-4 text-center">{renderCell(row.pro)}</td>
                      <td className="p-4 text-center bg-indigo-500/5">{renderCell(row.dfy)}</td>
                    </tr>
                  ))}

                {/* Section Header: Setup & Onboarding */}
                <tr className="bg-zinc-900/20">
                  <td colSpan={3} className="p-3 text-[10px] font-bold uppercase tracking-wider text-indigo-400 pl-4">
                    {'SETUP & ONBOARDING'}
                  </td>
                </tr>
                {comparisonFeatures
                  .filter((f) => f.section === "setup")
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-900/20 transition">
                      <td className="p-4 font-semibold text-zinc-200">{row.name}</td>
                      <td className="p-4 text-center">{renderCell(row.pro)}</td>
                      <td className="p-4 text-center bg-indigo-500/5">{renderCell(row.dfy)}</td>
                    </tr>
                  ))}

                {/* Section Header: Support & Strategy */}
                <tr className="bg-zinc-900/20">
                  <td colSpan={3} className="p-3 text-[10px] font-bold uppercase tracking-wider text-indigo-400 pl-4">
                    {'SUPPORT & STRATEGY'}
                  </td>
                </tr>
                {comparisonFeatures
                  .filter((f) => f.section === "support")
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-900/20 transition">
                      <td className="p-4 font-semibold text-zinc-200">{row.name}</td>
                      <td className="p-4 text-center">{renderCell(row.pro)}</td>
                      <td className="p-4 text-center bg-indigo-500/5">{renderCell(row.dfy)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="text-center text-[10px] text-zinc-500">
            {'* DIY = Do It Yourself (Supported by our detailed configuration guide documents).'}
          </div>
        </section>

        {/* 4. FAQ ACCORDION SECTION */}
        <section className="max-w-3xl mx-auto px-4 pb-24 space-y-8">
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

      </div>
      <Footer />
    </div>
  );
}