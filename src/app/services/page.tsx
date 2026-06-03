"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { 
  Check, 
  X,
  ArrowRight, 
  HelpCircle, 
  ChevronDown,
  Settings,
  MessageSquareCode,
  PenTool,
  BarChart3,
  CheckCircle2,
  Users,
  Radio,
  Lock
} from "lucide-react";

export default function ServicesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const painPoints = [
    {
      title: "Overwhelmed Support Team",
      desc: "Your customer care agents are burnt out answering the exact same business questions, leading to slow replies and lost deals."
    },
    {
      title: "Manual Follow-up and Recovery",
      desc: "Losing potential sales because your team is manually tracking leads and trying to recover incomplete carts with copy-paste workflows."
    },
    {
      title: "No Structured Leads Tracking",
      desc: "Operating with zero clarity. Chat lists are chaotic, and you cannot easily distinguish between raw leads, hot prospects, and paid customers."
    }
  ];

  const dfyServices = [
    {
      title: "Full Account & Workspace Setup",
      desc: "We configure your amarchat dashboard, connect your Phone Number ID securely, set up access tokens, and verify your Meta configurations.",
      icon: Settings
    },
    {
      title: "Custom Chatbot Flow Training",
      desc: "We construct conversational paths based on your business specifications. Your AI will reply to FAQs accurately, in standard Bangla or English.",
      icon: MessageSquareCode
    },
    {
      title: "Promotional Copywriting",
      desc: "Our copywriters write high-converting, Meta-compliant promotional template copies designed to bypass strict approval rules.",
      icon: PenTool
    },
    {
      title: "Broadcast Campaign Strategy",
      desc: "We structure your bulk marketing campaigns, set up scheduled queues, and define segments to reach thousands of customers without spam filters.",
      icon: Radio
    },
    {
      title: "Analytics & Conversion Monitoring",
      desc: "We analyze incoming conversation statistics, track message delivery/open rates, and adjust chatbot prompts for optimized conversions.",
      icon: BarChart3
    },
    {
      title: "Number Reputation & Green Tick Support",
      desc: "We monitor your Meta quality ratings, ensure optimal deliverability, and guide your business through the official Green Tick application process.",
      icon: CheckCircle2
    },
    {
      title: "Support Agent Training",
      desc: "We train your customer service agents on how to use our Shared Inbox interface, handle conversations, and manually take over AI sessions.",
      icon: Users
    }
  ];

  const comparisons = [
    {
      metric: "Monthly Cost",
      agency: "৳25,000 - ৳50,000",
      freelancer: "৳15,000 - ৳25,000",
      inhouse: "৳30,000 - ৳40,000",
      amarchat: "৳9,999/month"
    },
    {
      metric: "Software License Included",
      agency: "No (Excluded)",
      freelancer: "No (Excluded)",
      inhouse: "No (Excluded)",
      amarchat: "Yes (SaaS Pro Included)"
    },
    {
      metric: "WhatsApp Tech Expertise",
      agency: "Generalist Support",
      freelancer: "Varying / Unreliable",
      inhouse: "Requires Onboarding",
      amarchat: "Specialized Experts"
    },
    {
      metric: "System Maintenance",
      agency: "Additional Charges",
      freelancer: "Varying Support",
      inhouse: "Requires Full-Time Pay",
      amarchat: "Proactive Daily Checkups"
    },
    {
      metric: "Meta API Configuration",
      agency: "Requires Client Setup",
      freelancer: "Unassisted Setup",
      inhouse: "Steep Learning Curve",
      amarchat: "100% Handled for You"
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Discovery & Workspace Audit",
      desc: "We study your business operational flow, current customer support problems, and design templates for your automation."
    },
    {
      step: "02",
      title: "Meta App Configuration",
      desc: "We connect your official Meta app, secure your Phone ID, set up access tokens, and implement exact webhook sync workflows."
    },
    {
      step: "03",
      title: "AI Knowledge Base Training",
      desc: "We import your raw FAQs, business guidelines, and product specifications to train our RAG model for conversational precision."
    },
    {
      step: "04",
      title: "Copywriting & Flow Assembly",
      desc: "Our copywriters script high-converting message structures and set up direct responsive interactive chat rules."
    },
    {
      step: "05",
      title: "Support Staff Onboarding",
      desc: "We run live onboarding sessions for your customer service agents, showing them how to use the shared dashboard and agent pipelines."
    },
    {
      step: "06",
      title: "Launch & Active Optimization",
      desc: "Your system goes live. We actively monitor conversation performance, update knowledge data, and maintain number deliverability."
    }
  ];

  const faqs = [
    {
      q: "What is included in the ৳9,999/month Done-For-You plan?",
      a: "This plan includes the full amarchat premium software subscription (SaaS Pro) plus a dedicated team of experts who configure your Meta API, write campaign templates, train the AI chatbot model, monitor quality ratings, and handle weekly system updates."
    },
    {
      q: "Do I have to pay for Meta's conversation fees?",
      a: "Yes. All official Meta conversation fees are billed directly to your payment card linked within your own Meta Business Suite. amarchat charges absolutely 0% markup on Meta's official API conversation charges."
    },
    {
      q: "Can we downgrade to the Self-Service ৳999/month plan later?",
      a: "Absolutely. Once your initial system, chatbot configurations, and campaigns are fully running, you can downgrade to our Self-Service plan at any time and manage the dashboard on your own."
    },
    {
      q: "How long does it take to get our system live?",
      a: "On average, the entire discovery, API connection, AI training, copy draft approval, and staff training phases are completed and ready for launch within 7 to 10 business days."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar />

        {/* 1. HERO SECTION */}
        <section className="relative pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              {'Done-For-You (DFY) Managed Service'}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl mx-auto">
              {'Your WhatsApp. Fully Built in '}
              <span className="text-purple-500">{'Month One.'}</span> <br />
              {'Actively Managed After.'}
            </h1>
            
            <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {'Get a dedicated WhatsApp automation team to set up your official Meta Cloud API, write converting templates, train custom AI chatbots, and train your agents. Starting at only '}
              <span className="text-white font-bold">{'৳9,999/month.'}</span>
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="https://wa.me/your-whatsapp-number" target="_blank" className="w-full sm:w-auto px-8 py-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 group">
                {'Book Setup Call'} <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto px-8 py-4 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all">
                {'View SaaS Plans'}
              </Link>
            </div>

            <p className="text-[11px] text-zinc-500 tracking-wide max-w-md mx-auto pt-2">
              {'Note: All Meta Cloud API conversation fees are paid directly to Meta via your connected payment card. amarchat charges 0% markup.'}
            </p>
          </div>
        </section>

        {/* 2. PROBLEMS BANNER */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-500">{'Market Reality'}</div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {'WhatsApp is your biggest growth lever.'} <br />
              <span className="text-zinc-500">{'Most businesses aren\'t using it right.'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {painPoints.map((pain, i) => (
              <div key={i} className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="size-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                  {'!'}
                </div>
                <h4 className="font-bold text-white text-sm">{pain.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. DONE FOR YOU SERVICES GRID */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{'Comprehensive Services'}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {'Everything done for you.'} <br />
              <span className="text-zinc-500">{'Nothing left to figure out.'}</span>
            </h2>
            <p className="text-xs md:text-sm text-zinc-400">
              {'We manage every single phase of your setup, deployment, and ongoing system checks so you can focus entirely on growing your revenue.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {dfyServices.map((srv, i) => (
              <div key={i} className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-6 space-y-4 hover:border-zinc-800 transition">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl w-fit">
                  <srv.icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-white text-sm">{srv.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{srv.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. COMPARISON TABLE */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-500">{'Cost-Benefit Analysis'}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {'How does ৳9,999/month compare?'}
            </h2>
            <p className="text-xs text-zinc-400">{'See how amarchat\'s specialized managed service scales above traditional hires.'}</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-900 bg-zinc-900/5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-300 font-semibold">
                  <th className="p-4">{'Features'}</th>
                  <th className="p-4">{'Traditional Agency'}</th>
                  <th className="p-4">{'Freelancers'}</th>
                  <th className="p-4">{'In-house Dev'}</th>
                  <th className="p-4 text-indigo-400 bg-indigo-500/5">{'amarchat DFY Elite'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 text-zinc-400">
                {comparisons.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-900/20 transition">
                    <td className="p-4 font-semibold text-zinc-200">{row.metric}</td>
                    <td className="p-4">{row.agency}</td>
                    <td className="p-4">{row.freelancer}</td>
                    <td className="p-4">{row.inhouse}</td>
                    <td className="p-4 text-indigo-300 bg-indigo-500/5 font-semibold">{row.amarchat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. STEP BY STEP PATH */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-900 space-y-16">
          <div className="text-center space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{'Implementation Journey'}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {'A Structured Path to Launch — Step by Step'}
            </h2>
            <p className="text-xs text-zinc-400">{'We take your system from scratch to absolute autopilot in weeks.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            {steps.map((st, i) => (
              <div key={i} className="space-y-4 relative">
                <div className="text-3xl font-extrabold text-indigo-600/40 font-mono">{st.step}</div>
                <h4 className="text-sm font-bold text-white">{st.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. FAQ SECTION */}
        <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 border-t border-zinc-900 space-y-8">
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

        {/* 7. BOTTOM CTA */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-16">
          <div className="relative rounded-3xl border border-indigo-500/20 bg-linear-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950/80 p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] -z-10 pointer-events-none" />
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-snug">
              {'Hand Over the Heavy Lifting to Us'}
            </h2>
            <p className="mt-4 text-xs md:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              {'Stop wasting time configuring APIs and troubleshooting template rejection errors. Get started with our Managed Elite Plan today.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="https://wa.me/your-whatsapp-number" target="_blank" className="w-full sm:w-auto px-8 py-3.5 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group">
                {'Activate DFY Elite (৳9,999)'} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto px-8 py-3.5 font-bold text-zinc-300 border border-zinc-800 rounded-xl hover:bg-zinc-900/50 hover:text-white transition-all">
                {'SaaS Self-Service Plan'}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}