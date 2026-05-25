"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, Loader2, Plus, Sparkles, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: string;
  content: string;
  created_at: string;
}

export default function KnowledgeBaseSettings() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/knowledge-base");
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load your AI knowledge base.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

      toast.success("AI has been successfully trained with new knowledge!");
      setContent("");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Training failed. Please try again.");
    } finally {
      setTraining(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/whatsapp/knowledge-base?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Knowledge document removed successfully.");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Could not delete the document.");
    } finally {
      setDeletingId(null);
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
            Add New Knowledge
          </div>
          <form onSubmit={handleTrain} className="space-y-4">
            <textarea
              required
              rows={8}
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
                  <Plus className="h-4 w-4" />
                  Train Sales Assistant
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* List Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4 text-violet-500" />
            Trained Documents ({documents.length})
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No custom knowledge added yet. Paste details on the left to train.
              </div>
            ) : (
              documents.map((doc) => {
                const timeAgo = formatDistanceToNow(new Date(doc.created_at), { addSuffix: true });
                return (
                  <div
                    key={doc.id}
                    className="group relative rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2 text-xs hover:border-slate-700 transition-all"
                  >
                    <p className="text-slate-300 leading-relaxed break-words whitespace-pre-line pr-6">
                      {doc.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Trained {timeAgo}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                        aria-label="Delete knowledge item"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}