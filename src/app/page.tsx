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
  ChevronDown 
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const features = [
    { title: "টিম শেয়ার্ড ইনবক্স", desc: "এক নাম্বার থেকে পুরো টিম চ্যাট করুন", icon: Users },
    { title: "মেটা এপিআই কানেকশন", desc: "১০০% ব্যান-মুক্ত অফিশিয়াল মেটা গেটওয়ে", icon: ShieldCheck },
    { title: "বিকাশ/নগদ স্ক্রিনশট এআই", desc: "এআই দিয়ে ফেক পেমেন্ট স্ক্রিনশট সনাক্ত করুন", icon: Zap },
    { title: "বাংলা ভয়েস রিডার", desc: "কাস্টমার ভয়েস মেসেজ দিলে এআই দিয়ে টেক্সট পড়ুন", icon: Brain },
    { title: "অফলাইন সেলস চ্যাটবট", desc: "আপনার ডাটা দিয়ে ট্রেইন করা অফলাইন এআই অ্যাসিস্ট্যান্ট", icon: MessageSquare },
    { title: "কাস্টমার পাইপলাইন ট্র্যাকিং", desc: "অর্ডার ডেলিভারি ও ফলো-আপ ট্র্যাকিং করুন", icon: GitBranch },
  ];

  const faqs = [
    {
      q: "মেটা হোয়াটসঅ্যাপ ক্লাউড এপিআই-এর খরচ কি এই প্ল্যানে অন্তর্ভুক্ত?",
      a: "মেটা তাদের প্ল্যাটফর্ম ব্যবহারের জন্য প্রতিটি ২৪-ঘণ্টার কনভারসেশন উইন্ডো অনুযায়ী সামান্য চার্জ করে থাকে, যা মেটা পোর্টাল থেকে সরাসরি আপনার কার্ডের মাধ্যমে পেমেন্ট করতে হবে। আমাদের ফি শুধুমাত্র সফটওয়্যার ও হোস্টিংয়ের জন্য।",
    },
    {
      q: "সফটওয়্যার ব্যবহার করার জন্য কি আমার পিসি সবসময় অন রাখতে হবে?",
      a: "না, এটি সম্পূর্ণ ক্লাউড-বেসড সফটওয়্যার। আপনার পিসি বা মোবাইল বন্ধ থাকলেও আপনার মেসেজ রিসিভ হবে, চ্যাটবট রিপ্লাই দেবে এবং ক্যাম্পেইন সচল থাকবে।",
    },
    {
      q: "আমার নম্বর ব্যান্ড (Ban) হওয়ার কোনো ঝুঁকি আছে কি?",
      a: "একেবারেই নেই। যেহেতু আমাদের প্ল্যাটফর্ম অফিশিয়াল মেটা ক্লাউড এপিআই ব্যবহার করে কাজ করে, তাই আনঅফিশিয়াল স্ক্র্যাপার সফটওয়্যারগুলোর মতো এখানে নম্বর ব্যান্ড হওয়ার কোনো ঝুঁকি নেই।",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar />

        {/* ১. হিরো সেকশন */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {'🇧🇩 Built for Bangladeshi E-com & F-com'}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl mx-auto">
              More Leads. Faster Follow-Up. <span className="text-purple-500">More Revenue.</span>
            </h1>
            <p className="mt-6 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {'ডেলিভারি চার্জের ঝামেলা মিটাতে bKash ভেরিফিকেশন এআই, বাংলা ভয়েস ট্রান্সক্রিপশন এবং মেটা অফিশিয়াল এপিআই এর মেলবন্ধনে আপনার এফ-কমার্স ব্যবসাকে করুন সম্পূর্ণ স্বয়ংক্রিয়।'}
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 group active:scale-95">
                Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all flex items-center justify-center gap-2">
                Live Demo
              </Link>
            </div>
          </div>

          {/* ফ্লোটিং মকআপ ড্যাশবোর্ড উইজেট */}
          <div className="pt-16 relative z-10 max-w-4xl mx-auto px-4">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-2 md:p-3 shadow-2xl shadow-indigo-500/5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center">
                <span className="text-xs text-zinc-600 font-mono">{'[ amarchat interactive dashboard mockup ]'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ২. আকর্ষণীয় ৫টি ট্রান্সফরমেশন সেকশন (ESLint safe) */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">amarchat ব্যবহার করলে আপনার বিজনেসে যে ৫টি পরিবর্তন আসবে:</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 rounded-xl bg-zinc-900/20 border border-zinc-900 space-y-1">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-emerald-500">✅</span> মাল্টিপল এজেন্ট, জিরো ব্যান রিস্ক:
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                {'আপনার পুরো সাপোর্ট টিম একটি WhatsApp নাম্বারেই যার যার ডিভাইস থেকে চ্যাট করবে। Official Meta API হওয়ায় আপনার গুরুত্বপূর্ণ বিজনেস নাম্বার ব্যান হওয়ার কোনো চান্সই নেই।'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/20 border border-zinc-900 space-y-1">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-emerald-500">✅</span> ব্রডকাস্ট ক্যাম্পেইন (অ্যাড কস্ট কমানোর জাদুকরী উপায়):
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                {'এখন ফেসবুকে ৮ টাকা খরচ করে একটা সেল আনা আকাশ কুসুম চিন্তা। এর চেয়ে আপনার পুরনো কাস্টমারদের CSV/Excel ফাইল বাল্ক আপলোড করে সরাসরি তাদের ইনবক্সে অফার ব্রডকাস্ট করুন। সেলস আসবে বহুগুণ বেশি!'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/20 border border-zinc-900 space-y-1">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-emerald-500">✅</span> অর্গানাইজড ফলো-আপ (Pipeline & Tags):
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                {'ট্যাগ ব্যবহার করে "ফ্রড" এবং "রিয়েল" কাস্টমার আলাদা করে সহজেই ফলো-আপ করতে পারবেন।'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/20 border border-zinc-900 space-y-1">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-emerald-500">✅</span> আপনার নিজস্ব AI অ্যাসিস্ট্যান্ট:
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                {'রাতে বা এজেন্টরা যখন অফলাইনে থাকবে, তখন আপনার ব্যবসার ডেটা দিয়ে ট্রেইন করা RAG AI একজন দক্ষ সেলস রিপ্রেজেন্টিটিভের মতো কাস্টমারদের রিপ্লাই দিয়ে সেলস ধরে রাখবে।'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/20 border border-zinc-900 space-y-1">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-emerald-500">✅</span> মালিকের ১০০% কন্ট্রোল ও সিকিউরিটি:
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                {'আপনার টিমের এজেন্টরা শুধু চ্যাট করবে। বিজনেসের সেনসিティブ ডেটা বা API Keys পুরোপুরি হাইড থাকবে, যার অ্যাক্সেস থাকবে শুধু আপনার (Owner) কাছে।'}
              </p>
            </div>
          </div>
        </section>

        {/* ৩. সম্পূর্ণ ফিচার গ্রিড সেকশন */}
        <section id="features" className="max-w-5xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold text-white">Everything you need to automate WhatsApp</h2>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">হোয়াটসঅ্যাপের প্রিমিয়াম সিআরএম এর সমস্ত মডার্ন টুলস এখন এক জায়গায়।</p>
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

        {/* ৪. How it Works সেকশন */}
        <section id="how-it-works" className="max-w-4xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold text-white">How it works</h2>
            <p className="text-xs md:text-sm text-zinc-400">সহজ ৩টি ধাপে আপনার amarchat প্ল্যাটফর্মটি রান করুন।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">1</span>
              <h4 className="text-sm font-bold text-white">মেটা এপিআই লিংক করুন</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">আপনার মেটা বিজনেস ম্যানেজার থেকে কাস্টম ফোন আইডি ও অ্যাক্সেস টোকেন দিয়ে কানেক্ট করুন।</p>
            </div>
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">2</span>
              <h4 className="text-sm font-bold text-white">এআই নলেজ বেস ট্রেইন করুন</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">আপনার ব্যবসার প্রোডাক্ট ক্যাটালগ ও প্রশ্নোত্তরগুলো পেস্ট করে ১ ক্লিকে এআই এসিস্ট্যান্ট ট্রেন করুন।</p>
            </div>
            <div className="text-center space-y-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-xs font-bold mx-auto">3</span>
              <h4 className="text-sm font-bold text-white">অটোমেটিক সেলস শুরু করুন</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">আপনার অফলাইন বা ব্যস্ত সময়ে এআই স্বয়ংক্রিয়ভাবে বাংলায় কাস্টমার হ্যান্ডেল করবে ও সেলস ক্লোজ করবে।</p>
            </div>
          </div>
        </section>

        {/* ৫. ড্রপডাউন FAQ সেকশন */}
        <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 border-t border-zinc-900 space-y-8">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center">সচরাচর জিজ্ঞাসিত প্রশ্নসমূহ (FAQ)</h2>
          
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