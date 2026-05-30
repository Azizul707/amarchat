'use client';

import React from 'react';
import Link from 'next/link';
import { Check, HelpCircle, Zap, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

const FAQS = [
  {
    q: 'মেটা হোয়াটসঅ্যাপ ক্লাউড এপিআই-এর খরচ কি এই প্ল্যানে অন্তর্ভুক্ত?',
    a: 'মেটা তাদের প্ল্যাটফর্ম ব্যবহারের জন্য প্রতিটি ২৪-ঘণ্টার কনভারসেশন উইন্ডো অনুযায়ী সামান্য চার্জ করে থাকে, যা মেটা পোর্টাল থেকে সরাসরি আপনার কার্ডের মাধ্যমে পেমেন্ট করতে হবে। আমাদের ফি শুধুমাত্র সফটওয়্যার ও হোস্টিংয়ের জন্য।',
  },
  {
    q: 'সフトওয়্যার ব্যবহার করার জন্য কি আমার পিসি সবসময় অন রাখতে হবে?',
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
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* টপ হেডার (ব্র্যান্ড লোগো স্প্লিট কালার) */}
        <div className="text-center space-y-4">
          <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-full uppercase tracking-wider">
            SaaS Pro Plan
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-2">
            <span className="text-white">amar</span><span className="text-purple-500">chat</span>-এর মাধ্যমে আপনার ব্যবসা পরিচালনা করুন
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            কোনো গোপন চার্জ নেই। মেটা অফিশিয়াল এপিআই ও স্মার্ট এআই সহ আপনার ব্যবসার আল্টিমেট সল্যুশন।
          </p>
        </div>

        {/* মার্কেটিং পেন বক্স (Problem & Core Transformations) */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
              <span>আনঅফিসিয়াল অ্যাপ ব্যবহার করে বিজনেসের WhatsApp নাম্বার ব্যান হওয়ার ভয়? 🚨</span>
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              বাংলাদেশের হাজারো ই-কমার্স এবং এফ-কমার্স প্রতিদিন এই ভয়ে থাকে! সাথে আছে এজেন্টদের ফোন শেয়ার করার প্যারা।
            </p>
            <p className="text-base font-bold text-white leading-normal">
              এই সব সমস্যার আল্টিমেট সল্যুশন নিয়ে এলো <span className="text-white font-extrabold">amar</span><span className="text-purple-500 font-extrabold">chat</span>! 🚀
            </p>
          </div>

          <div className="border-t border-zinc-800/80 pt-6 space-y-4">
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
              amarchat ব্যবহার করলে আপনার বিজনেসে যে ৫টি বড় পরিবর্তন আসবে:
            </h4>
            
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-500">✅</span> মাল্টিপল এজেন্ট, জিরো ব্যান রিস্ক:
                </span>
                <p className="text-xs text-zinc-400 leading-normal pl-7">
                  আপনার পুরো সাপোর্ট টিম একটি WhatsApp নাম্বারেই যার যার ডিভাইস থেকে চ্যাট করবে। Official Meta API হওয়ায় আপনার গুরুত্বপূর্ণ বিজনেস নাম্বার ব্যান হওয়ার কোনো চান্সই নেই।
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-500">✅</span> ব্রডকাস্ট ক্যাম্পেইন (অ্যাড কস্ট কমানোর জাদুকরী উপায়):
                </span>
                <p className="text-xs text-zinc-400 leading-normal pl-7">
                  এখন ফেসবুকে ৮ টাকা খরচ করে একটা সেল আনা আকাশ কুসুম চিন্তা। এর চেয়ে আপনার পুরনো কাস্টমারদের CSV/Excel ফাইল বাল্ক আপলোড করে সরাসরি তাদের ইনবক্সে অফার ব্রডকাস্ট করুন। সেলস আসবে বহুগুণ বেশি!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-500">✅</span> অর্গানাইজড ফলো-আপ (Pipeline & Tags):
                </span>
                <p className="text-xs text-zinc-400 leading-normal pl-7">
                  {'ট্যাগ ব্যবহার করে "ফ্রড" এবং "রিয়েল" কাস্টমার আলাদা করে সহজেই ফলো-আপ করতে পারবেন।'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-500">✅</span> আপনার নিজস্ব AI অ্যাসিস্ট্যান্ট:
                </span>
                <p className="text-xs text-zinc-400 leading-normal pl-7">
                  রাতে বা এজেন্টরা যখন অফলাইনে থাকবে, তখন আপনার ব্যবসার ডেটা দিয়ে ট্রেইন করা RAG AI একজন দক্ষ সেলস রিপ্রেজেন্টিটিভের মতো কাস্টমারদের রিপ্লাই দিয়ে সেলস ধরে রাখবে।
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="text-emerald-500">✅</span> মালিকের ১০০% কন্ট্রোল ও সিকিউরিটি:
                </span>
                <p className="text-xs text-zinc-400 leading-normal pl-7">
                  আপনার টিমের এজেন্টরা শুধু চ্যাট করবে। বিজনেসের সেনসিティブ ডেটা বা API Keys পুরোপুরি হাইড থাকবে, যার অ্যাক্সেস থাকবে শুধু আপনার (Owner) কাছে।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* বিদেশি কার্ডের প্যারা বনাম amarchat ইন্ডিগো নোটিশ বক্স */}
        <div className="p-5 md:p-6 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs md:text-sm leading-relaxed text-zinc-200">
          <span className="font-bold text-indigo-400 block mb-1">💡 কার্ডের প্যারা ছাড়াই সরাসরি দেশি পেমেন্ট!</span>
          {'বিদেশি টুল ইউজ করতে গেলে মাসে ৫,০০০+ ১৫% ভ্যাট আর ডুয়েল কারেন্সি কার্ডের প্যারা নিতে হয়। কিন্তু amarchat-এর রেগুলার সাবস্ক্রিপশন মাত্র ৯৯৯ টাকা/মাস, আর পেমেন্ট করতে পারবেন সরাসরি বিকাশ বা নগদে!'}
        </div>

        {/* একটিমাত্র বাজেট-ফ্রেন্ডলি প্রিমিয়াম প্ল্যান কার্ড (Centered Layout) */}
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border-2 border-indigo-500 bg-zinc-900/40 p-6 md:p-8 flex flex-col justify-between relative shadow-indigo-500/15 shadow-xl text-zinc-100 transition hover:border-indigo-400">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase tracking-wider shadow-md">
              SaaS Pro (Recommended)
            </div>
            
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white">SaaS Pro Plan</h3>
                <p className="text-xs text-zinc-400 mt-2">মাঝারি বা দ্রুত বর্ধনশীল ব্যবসার জন্য সবচেয়ে জনপ্রিয় অল-ইন-ওয়ান চয়েস।</p>
              </div>

              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-extrabold text-white">৳৯৯৯</span>
                <span className="text-sm text-zinc-400 ml-1">/মাস</span>
              </div>

              <div className="border-t border-zinc-850 pt-6 space-y-4">
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-center">কী কী থাকছে এই প্ল্যানে:</p>
                <ul className="space-y-3.5">
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>আনলিমিটেড চ্যাট এজেন্ট অ্যাক্সেস</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>১০,০০০ কন্টাক্ট লিমিট</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>রিয়েল-টাইম ইনবক্স ও টিম কোলাবোরেশন</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>সম্পূর্ণ কাস্টমার পাইপলাইন ট্র্যাকিং</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>মেটা অফিশিয়াল ব্রডকাস্ট ক্যাম্পেইন</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>স্মার্ট চ্যাটবট ও অটোমেশন (২৪/৭)</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>অগ্রাধিকার সাপোর্ট (WhatsApp/Call)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link 
                href="/signup"
                className="w-full py-3.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
              >
                <span>Choose Pro Plan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
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
                পদ্ধতিগত কার্যকারিতা পরীক্ষা করতে আমাদের প্ল্যানে ৩ দিনের ফ্রি ট্রায়াল পাবেন। কাস্টমার কেয়ারে নক দিয়ে এখনই এক্টিভেট করিয়ে নিন।
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