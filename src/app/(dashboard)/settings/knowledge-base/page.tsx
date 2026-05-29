"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Trash2, Loader2, Sparkles, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: string;
  content: string;
  created_at: string;
}

export default function KnowledgeBaseSettings() {
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      // ব্রাউজার ক্যাশ ও সিডিএন মেমোরি বাইপাস করতে ডাইনামিক টাইমস্ট্যাম্প ও no-store হেডার যুক্ত করা হলো
      const res = await fetch(`/api/whatsapp/knowledge-base?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load knowledge base");
      const data = await res.json();
      if (data) {
        setDocument(data);
        setContent(data.content);
      } else {
        setDocument(null);
        setContent("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load your AI knowledge base.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleTrain = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter some knowledge base content.");
      return;
    }

    setTraining(true);
    try {
      const res = await fetch("/api/whatsapp/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Training failed");
      }

      toast.success("AI has been successfully trained with updated knowledge!");
      router.refresh(); // নেক্সট রাউটার ক্যাশ ক্লিয়ার করা হলো
      await fetchDocument();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Training failed. Please try again.");
    } finally {
      setTraining(false);
    }
  };

  const handleClear = async () => {
    const userConfirmed = window.confirm(
      "আপনি কি নিশ্চিত যে আপনি আপনার এআই সেলস অ্যাসিস্ট্যান্টের সমস্ত শেখানো তথ্য (Knowledge Base) সম্পূর্ণ মুছে ফেলতে চান?\n\nসতর্কতা: এই কাজটি আর ফিরিয়ে আনা যাবে না।"
    );

    if (!userConfirmed) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/whatsapp/knowledge-base", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Clear failed");

      toast.success("Knowledge base cleared successfully.");
      router.refresh(); // নেক্সট রাউটার ক্যাশ ক্লিয়ার করা হলো
      setDocument(null);
      setContent("");
    } catch (err) {
      console.error(err);
      toast.error("Could not clear the knowledge base.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2 text-violet-500">
          <Brain className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-white">AI Sales Assistant Training</h1>
        </div>
        <p className="text-sm text-slate-400">
          Train your AI sales closer with product catalogs, pricing details, and FAQs. The AI will use this knowledge base to close sales in real-time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {document ? "Update Business Knowledge" : "Train New Knowledge"}
          </div>
          <form onSubmit={handleTrain} className="space-y-4">
            <textarea
              required
              rows={10}
              disabled={training}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your product list, price details, or FAQs here... (e.g., 'লাল থ্রি-পিসের দাম ১২০০ টাকা, ডেলিভারি চার্জ ঢাকার বাইরে ১৫০ টাকা।')"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
            <Button
              type="submit"
              disabled={training}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium h-10 transition-colors"
            >
              {training ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating AI Vectors...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {document ? "Update & Retrain Assistant" : "Train Sales Assistant"}
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Status/Display Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4 text-violet-500" />
            Active Knowledge Base Status
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent flex flex-col justify-between">
            {loading ? (
              <div className="flex items-center justify-center py-12 flex-1">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : !document ? (
              <div className="text-center py-12 text-sm text-slate-500 flex-1 flex flex-col justify-center items-center">
                <p>No active business knowledge trained yet.</p>
                <p className="text-xs text-slate-600 mt-1">Paste details on the left and click Train to activate.</p>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col justify-between flex-1">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    Active Trained Knowledge
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-line">
                    {document.content}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-[10px] text-slate-500">
                  <span>Last trained {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={clearing}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-bold cursor-pointer disabled:opacity-50"
                    aria-label="Clear knowledge base"
                  >
                    {clearing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Clear Knowledge
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}