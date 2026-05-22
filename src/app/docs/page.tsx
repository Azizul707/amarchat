'use client';

import React, { useState } from 'react';
import { MessageSquare, Users, BookOpen, Settings, Radio, HelpCircle } from 'lucide-react';

const DOCS_SECTIONS = [
  {
    id: 'getting-started',
    title: '১. শুরু করার গাইড',
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">আমারচ্যাট (amarchat) এ আপনাকে স্বাগতম</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          আমারচ্যাট হলো বাংলাদেশি উদ্যোক্তাদের জন্য তৈরি একটি অফিশিয়াল হোয়াটসঅ্যাপ সিআরএম এবং চ্যাটবট অটোমেশন সফটওয়্যার। এর সাহায্যে আপনি আপনার ফেসবুক, ইনস্টাগ্রাম বা ই-কমার্স বিজনেসের সমস্ত কাস্টমারদের হোয়াটসঅ্যাপ মেসেজ একই সেন্ট্রাল ইনবক্সে বসে নিয়ন্ত্রণ করতে পারবেন।
        </p>
        <h3 className="text-sm font-semibold text-zinc-200 mt-4">অ্যাকাউন্ট তৈরির পরবর্তী পদক্ষেপসমূহ:</h3>
        <ul className="list-decimal pl-5 text-xs text-zinc-400 space-y-2 leading-relaxed">
          <li>প্রথমে আমদের প্যানেলে একটি অ্যাকাউন্ট তৈরি (Sign Up) করুন।</li>
          <li>আপনার অ্যাকাউন্টটি সচল করতে এডমিনের সাথে যোগাযোগ করে ট্রায়াল বা পেইড প্ল্যানটি চালু করিয়ে নিন।</li>
          <li>এরপর আপনার &quot;Settings &gt; Workspace&quot; ট্যাবে গিয়ে আপনার ব্র্যান্ডের নাম সেট করে নিন।</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'meta-setup',
    title: '২. মেটা ক্লাউড এপিআই কানেক্ট',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">অফিশিয়াল মেটা ক্লাউড এপিআই সেটআপ গাইড</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          আপনার নাম্বারকে হোয়াটসঅ্যাপ সিআরএমের সাথে কানেক্ট করতে মেটা পোর্টাল ব্যবহার করতে হবে। এতে আপনার নাম্বার ব্যান্ড হওয়ার কোনো ঝুঁকি থাকে না।
        </p>
        <h3 className="text-sm font-semibold text-zinc-200 mt-4">ধাপসমূহ:</h3>
        <ul className="list-decimal pl-5 text-xs text-zinc-400 space-y-3 leading-relaxed">
          <li>প্রথমে <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Meta Developers Portal</a>-এ গিয়ে একটি ফেসবুক ডেভেলপার একাউন্ট এবং একটি নতুন অ্যাপ তৈরি করুন।</li>
          <li>অ্যাপের ভেতর থেকে <strong>WhatsApp</strong> প্রোডাক্টটি সেটআপ করুন।</li>
          <li>সেখান থেকে আপনার <strong>Phone Number ID</strong> এবং <strong>Temporary Access Token</strong> কপি করে নিন। (স্থায়ী ব্যবহারের জন্য Meta Business Manager থেকে Permanent System User Token জেনারেট করে নেওয়া অত্যন্ত বাঞ্ছনীয়)।</li>
          <li>কপি করা তথ্যগুলো আমাদের প্যানেলে গিয়ে <strong>Settings &gt; WhatsApp Config</strong> ট্যাবে বসিয়ে Save করুন।</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'team-agents',
    title: '৩. এজেন্ট ও চ্যাট অ্যাসাইনমেন্ট',
    icon: Users,
    content: (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">চ্যাট এজেন্ট যুক্ত করা ও কাজের বন্টন</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          আপনার টিমে যদি একাধিক কর্মচারী থাকেন, তবে আপনি সবাইকে আলাদা হোয়াটসঅ্যাপ অ্যাকাউন্ট না দিয়েই একই প্যানেলে সবার কাজ ট্র্যাক করতে পারবেন।
        </p>
        <h3 className="text-sm font-semibold text-zinc-200 mt-4">কাজের নিয়মাবলি:</h3>
        <ul className="list-decimal pl-5 text-xs text-zinc-400 space-y-2 leading-relaxed">
          <li>প্রথমে আপনার এজেন্টকে আমাদের সাইটে গিয়ে একটি অ্যাকাউন্ট তৈরি করতে বলুন।</li>
          <li>এজেন্ট অ্যাকাউন্ট তৈরি করার পর ওনার নিজের একাউন্ট থেকে <strong>Settings &gt; Team</strong> ট্যাবে গিয়ে এজেন্টের রেজিস্টার্ড ইমেইলটি লিখে &quot;Add Agent&quot; বাটনে ক্লিক করবেন।</li>
          <li>এজেন্ট সাথে সাথে ওয়ার্কস্পেসে যুক্ত হয়ে যাবেন। এবার ইনবক্সে কাস্টমারের চ্যাটের ড্রপডাউন থেকে যেকোনো এজেন্টকে এসাইন করে দেওয়া যাবে।</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'broadcasts',
    title: '৪. ব্রডকাস্ট এবং মার্কেটিং',
    icon: Radio,
    content: (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">বাল্ক হোয়াটসঅ্যাপ ব্রডকাস্ট ক্যাম্পেইন</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          ঈদের ডিসকাউন্ট অফার বা নতুন প্রোডাক্টের অফার একসাথে হাজার হাজার কাস্টমারের হোয়াটসঅ্যাপ ইনবক্সে অফিশিয়াল উপায়ে পাঠানোর গাইডলাইন।
        </p>
        <h3 className="text-sm font-semibold text-zinc-200 mt-4">কীভাবে ক্যাম্পেইন পাঠাবেন:</h3>
        <ul className="list-decimal pl-5 text-xs text-zinc-400 space-y-2 leading-relaxed">
          <li>প্রথমে মেটা পোর্টাল থেকে আপনার অফার মেসেজটির জন্য একটি নতুন <strong>Message Template</strong> বানিয়ে অনুমোদন করিয়ে নিন।</li>
          <li>অনুমোদন হওয়ার পর আমদের সেটিংসের &quot;Templates&quot; ট্যাবে সেটি অটোমেটিক লোড হবে।</li>
          <li>এরপর ব্রডকাস্ট সেকশন থেকে টেমপ্লেটটি সিলেক্ট করে আপনার পুরাতন কাস্টমারদের ডেস্টিনেশন বা কন্টাক্ট লিস্ট সিলেক্ট করে এক ক্লিকে ক্যাম্পেইন সচল করুন।</li>
        </ul>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const currentDoc = DOCS_SECTIONS.find((s) => s.id === activeSection);
  const CurrentIcon = currentDoc?.icon || BookOpen;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* হেডার */}
        <div className="border-b border-zinc-900 pb-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-500" />
            <span>আমারচ্যাট ব্যবহার নির্দেশিকা (Documentation)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            আমারচ্যাটের প্রতিটি ফিচার খুব সহজে ব্যবহার করার জন্য ধাপে ধাপে গাইডলাইন।
          </p>
        </div>

        {/* মেইন কনটেন্ট ও সাইডবার লেআউট */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* বামপাশের সাইডবার মেনু */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 px-3">টপিকসমূহ</p>
            <div className="flex flex-col gap-1">
              {DOCS_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = sec.id === activeSection;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ডানপাশের বিস্তারিত কন্টেন্ট এরিয়া */}
          <div className="md:col-span-3 bg-zinc-900/10 border border-zinc-900 rounded-2xl p-6 md:p-8 min-h-[400px]">
            <div className="flex items-center gap-2.5 border-b border-zinc-850 pb-4 mb-6">
              <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-900 text-indigo-400">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <span className="text-xs text-zinc-400">টপিক: {currentDoc?.title}</span>
            </div>
            
            {/* ডাইনামিক রেন্ডারিং */}
            <div className="prose prose-invert max-w-none font-sans">
              {currentDoc?.content}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}