import Link from "next/link";
import { 
  MessageSquare, 
  Users, 
  Zap, 
  Shield, 
  Check, 
  Star, 
  ArrowRight, 
  Bot, 
  Coins, 
  Lock 
} from "lucide-react";

// ৩-কলাম ভ্যালু প্রোপোজিশন ডাটা
const features = [
  {
    icon: Bot,
    title: "AI Chat Agents (Gemini/GPT)",
    description: "Deploy intelligent, custom-trained AI agents that speak Bengali & English. Answer queries, take orders, and qualify leads 24/7.",
  },
  {
    icon: Users,
    title: "Shared Team Inbox",
    description: "Multiple agents can log in and respond to customers using one single official WhatsApp number. No more missing chats.",
  },
  {
    icon: Zap,
    title: "Safe Bulk Broadcasting",
    description: "Send promotional campaigns, offers, and order confirmations to thousands of contacts safely using Meta's official APIs.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-indigo-500/30">
      
      {/* ১. স্টিকি হেডার (Header Navigation) */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* লোগো */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20 group-hover:bg-indigo-500 transition-colors">
              a
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              amar<span className="text-indigo-500">chat</span>
            </span>
          </Link>

          {/* নেভিগেশন লিংকসমূহ */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#docs" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Docs
            </a>
          </nav>

          {/* লগইন এবং সাইনআপ বাটন */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* প্রধান কন্টেন্ট এরিয়া */}
      <main className="flex-1">
        
        {/* ২. হিরো সেকশন (Hero Section) */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          {/* ব্যাকগ্রাউন্ড ডেকোরেশন */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            {/* ব্যাজ */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400 mb-6 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              🇧🇩 Built for Bangladeshi E-com & F-com
            </div>

            {/* মেইন হেডলাইন */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
              Automate Your Sales With <span className="text-indigo-500">amarchat AI</span> in Less Than 15 Minutes.
            </h1>

            {/* সাব-হেডলাইন */}
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Close deals 24/7, respond instantly in Bengali/English, and save costs while avoiding number bans using Meta&apos;s Official WhatsApp API.
            </p>

            {/* কল-টু-অ্যাকশন বাটন */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/signup" 
                className="w-full sm:w-auto px-8 py-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 group active:scale-95"
              >
                Start Free MVP
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Live Demo
              </Link>
            </div>
          </div>
        </section>

        {/* ৩. দ্য পিএএস সেকশন (The PAS Section) */}
        <section className="py-20 bg-zinc-950/40 border-y border-zinc-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
                The Hard Truth About Manual Chatting
              </h2>
              <p className="mt-4 text-zinc-400">
                Are you tired of losing potential sales because your page inbox is flooded with customer messages?
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* পেইনপয়েন্ট ১ */}
              <div className="p-6 rounded-xl border border-zinc-900 bg-[#09090b]/40">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Expensive Competitors</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  International tools like Wati or Interakt cost upwards of $40-$100 every month. For local startups and mid-sized businesses, this billing is an absolute profit killer.
                </p>
              </div>

              {/* পেইনপয়েন্ট ২ */}
              <div className="p-6 rounded-xl border border-zinc-900 bg-[#09090b]/40">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Risky Unofficial Tools</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Using unofficial extensions or scripts to bulk-message customers often leads to permanent Meta number bans, ruining your brand&apos;s reputation overnight.
                </p>
              </div>
            </div>

            {/* সমাধান বা সলিউশন */}
            <div className="mt-12 p-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <h4 className="text-xl font-bold text-indigo-400">The Solution: amarchat</h4>
              <p className="mt-3 text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
                By integrating directly with **Meta&apos;s Official Cloud API**, we provide a reliable, zero-risk, and highly cost-effective dashboard. Zero-budget setup for local entrepreneurs, backed by AI automation.
              </p>
            </div>
          </div>
        </section>

        {/* ৪. ভ্যালু প্রোপোজিশন (Features Grid) */}
        <section id="features" className="py-20 md:py-32 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Supercharge Your Sales Machine
              </h2>
              <p className="mt-4 text-zinc-400">
                Everything you need to scale your sales channel without hiring an army of support staff.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-8 rounded-2xl border border-zinc-800 bg-[#09090b] hover:border-zinc-700 transition-all hover:-translate-y-1 duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-6">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ৫. সোশ্যাল প্রুফ (Social Proof & Meta Badge) */}
        <section className="py-20 bg-zinc-950/40 border-y border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-2xl font-bold text-zinc-300">Trusted by Local Businesses</h2>
              
              {/* মেটা পার্টনার ব্যাজ */}
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-300 font-semibold shadow-inner">
                <Shield className="w-5 h-5 text-indigo-500" />
                Meta Official API Integration Secured
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {/* প্রশংসাপত্র ১ */}
              <div className="p-8 rounded-2xl border border-zinc-800 bg-[#09090b] relative">
                <div className="flex gap-1 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  &ldquo;Using manual agents to qualify leads was costing us 35,000 BDT/month in salary alone. With amarchat AI Agents, we now close almost 70% of standard orders automatically. Absolute gamechanger.&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    FM
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">FloraMax Agri Team</h4>
                    <p className="text-xs text-zinc-500">Agri-Tech Business Owner</p>
                  </div>
                </div>
              </div>

              {/* প্রশংসাপত্র ২ */}
              <div className="p-8 rounded-2xl border border-zinc-800 bg-[#09090b] relative">
                <div className="flex gap-1 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  &ldquo;I was skeptical because my previous WhatsApp number was banned when using an unofficial chrome extension. Since moving to amarchat&apos;s Meta integration, we have zero issues and instant replies.&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    KA
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Karigor Arts</h4>
                    <p className="text-xs text-zinc-500">F-Commerce Brand Founder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ৬. ফাইনাল সিটিএ (Final CTA Section) */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-900/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-4xl font-black text-white tracking-tight">
              Ready to Save Costs and Sell 24/7?
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Get started with our free MVP plan today and connect your Meta developer account instantly.
            </p>

            <div className="mt-10 flex justify-center">
              <Link 
                href="/signup" 
                className="px-10 py-5 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-all shadow-[0_0_50px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_rgba(99,102,241,0.7)] flex items-center gap-2 group active:scale-95"
              >
                Sign Up Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ফুটার */}
      <footer className="border-t border-zinc-900 bg-[#09090b] py-8 text-center text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} amarchat. All rights reserved.</p>
      </footer>
    </div>
  );
}