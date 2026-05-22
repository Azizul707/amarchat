'use client';

import React from 'react';
import Link from 'next/link';
import { Check, HelpCircle, Rocket, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: '৳১,৪৯৯',
    period: '/মাস',
    description: 'ছোট ব্যবসা বা নতুন এফ-কমার্স উদ্যোক্তাদের জন্য উপযুক্ত।',
    features: [
      '১ জন চ্যাট এজেন্ট অ্যাক্সেস',
      '১,০০০ কন্টাক্ট লিমিট',
      'রিয়েল-টাইম সেন্ট্রাল ইনবক্স',
      'বেসিক চ্যাট অ্যাসাইনমেন্ট',
      'মেটা অফিশিয়াল এপিআই কানেকশন',
      'ইমেইল ও চ্যাট সাপোর্ট',
    ],
    cta: 'Get Started',
    popular: false,
    color: 'border-zinc-800 bg-zinc-900/20 text-zinc-100',
  },
  {
    name: 'SaaS Pro (Recommended)',
    price: '৳২,৯৯৯',
    period: '/মাস',
    description: 'মাঝারি বা দ্রুত বর্ধনশীল ব্যবসার জন্য সবচেয়ে জনপ্রিয় চয়েস।',
    features: [
      'আনলিমিটেড চ্যাট এজেন্ট অ্যাক্সেস',
      '১০,০০০ কন্টাক্ট লিমিট',
      'রিয়েল-টাইম ইনবক্স ও টিম কোলাবোরেশন',
      'সম্পূর্ণ কাস্টমার পাইপলাইন ট্র্যাকিং',
      'মেটা অফিশিয়াল ব্রডকাস্ট ক্যাম্পেইন',
      'স্মার্ট চ্যাটবট ও অটোমেশন (২৪/৭)',
      'অগ্রাধিকার সাপোর্ট (WhatsApp/Call)',
    ],
    cta: 'Choose Pro',
    popular: true,
    color: 'border-indigo-500 bg-zinc-900/40 relative shadow-indigo-500/10 shadow-lg text-zinc-100',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'বড় কোম্পানি বা কাস্টম ইন্টিগ্রেশন প্রয়োজন এমন ব্র্যান্ডের জন্য।',
    features: [
      'আনলিমিটেড কন্টাক্ট এবং চ্যাট এজেন্ট',
      'কাস্টম চ্যাটবট ও এপিআই ডেভেলপমেন্ট',
      'ডেডিকেটেড একাউন্ট ম্যানেজার',
      'বিশেষায়িত ডাটাবেস ও সিকিউরিটি',
      '১-অন-১ টিম অনবোর্ডিং ট্রেইনিং',
      '২৪/৭ ফোন ও ইন-পার্সন সাপোর্ট',
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'border-zinc-800 bg-zinc-900/20 text-zinc-100',
  },
];

const FAQS = [
  {
    q: 'মেটা হোয়াটসঅ্যাপ ক্লাউড এপিআই-এর খরচ কি এই প্ল্যানে অন্তর্ভুক্ত?',
    a: 'মেটা তাদের প্ল্যাটফর্ম ব্যবহারের জন্য প্রতিটি ২৪-ঘণ্টার কনভারসেশন উইন্ডো অনুযায়ী সামান্য চার্জ করে থাকে, যা মেটা পোর্টাল থেকে সরাসরি আপনার কার্ডের মাধ্যমে পেমেন্ট করতে হবে। আমাদের ফি শুধুমাত্র সফটওয়্যার ও হোস্টিংয়ের জন্য।',
  },
  {
    q: 'সফটওয়্যার ব্যবহার করার জন্য কি আমার পিসি সবসময় অন রাখতে হবে?',
    a: 'না, এটি সম্পূর্ণ ক্লাউড-বেসড সফটওয়্যার। আপনার পিসি বা মোবাইল বন্ধ থাকলেও আপনার মেসেজ রিসিভ হবে, চ্যাটবট রিপ্লাই দেবে এবং ক্যাম্পেইন সচল থাকবে।',
  },
  {
    q: 'আমার নম্বর ব্যান্ড (Ban) হওয়ার কোনো ঝুঁকি আছে কি?',
    a: 'একেবারেই নেই। যেহেতু আমাদের প্ল্যাটফর্ম অফিশিয়াল মেটা ক্লাউড এপিআই ব্যবহার করে কাজ করে, তাই আনঅফিশিয়াল স্ক্র্যাপার সফটওয়্যারগুলোর মতো এখানে নম্বর ব্যান্ড হওয়ার কোনো ঝুঁকি নেই।',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-16 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* টপ হেডার */}
        <div className="text-center space-y-4">
          <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full uppercase tracking-wider">
            Pricing Plans
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-2">
            আপনার ব্যবসার জন্য সঠিক মূল্য বেছে নিন
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            কোনো গোপন চার্জ নেই। আপনার প্রয়োজন অনুযায়ী সেরা প্ল্যানটি বেছে নিয়ে আজই শুরু করুন হোয়াটসঅ্যাপ অটোমেশন।
          </p>
        </div>

        {/* ৩টি কলাম প্ল্যান গ্রিড */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan) => (
            <div 
              key={plan.name} 
              className={`rounded-2xl border p-6 md:p-8 flex flex-col justify-between transition hover:border-zinc-700 ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{plan.description}</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-4xl md:text-5xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-zinc-400 ml-1">{plan.period}</span>
                </div>

                <div className="border-t border-zinc-800/80 pt-6 space-y-4">
                  <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">কী কী থাকছে:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-zinc-400">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <Link 
                  href="/signup"
                  className={`w-full py-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    plan.popular 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' 
                      : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* হেল্প ও ট্রাস্ট ব্যাজ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="p-3 bg-zinc-950 rounded-xl h-fit border border-zinc-900">
              <Zap className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">৩-দিনের ফ্রি ট্রায়াল সুবিধা</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                পদ্ধতিগত কার্যকারিতা পরীক্ষা করতে যেকোনো প্ল্যানে ৩ দিনের ফ্রি ট্রায়াল পাবেন। কাস্টমার কেয়ারে নক দিয়ে এখনই এক্টিভেট করিয়ে নিন।
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-zinc-950 rounded-xl h-fit border border-zinc-900">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">নিরাপদ পেমেন্ট ও রিফান্ড পলিসি</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                আমরা বিকাশ, নগদ এর মাধ্যমে পেমেন্ট গ্রহণ করি। কোনো কারণে সার্ভিস পছন্দ না হলে প্রথম ৭ দিনের মধ্যে ১০০% ক্যাশব্যাক গ্যারান্টি।
              </p>
            </div>
          </div>
        </div>

        {/* FAQ সেকশন */}
        <div className="space-y-6 max-w-3xl mx-auto pt-8 border-t border-zinc-900">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center">সচরাচর জিজ্ঞাসিত প্রশ্নসমূহ (FAQ)</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-5 space-y-2">
                <h4 className="font-semibold text-zinc-200 text-sm flex gap-2 items-center">
                  <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}