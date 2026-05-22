"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, LayoutTemplate, Paperclip, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplyQuote } from "./reply-quote";
// সুপাবেস এবং সোনার টোস্ট ইম্পোর্ট
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReplyDraft {
  id: string;
  authorLabel: string;
  preview: string;
}

interface MessageComposerProps {
  conversationId: string;
  sessionExpired: boolean;
  onSend: (text: string, replyToId?: string) => void;
  onOpenTemplates: () => void;
  replyTo?: ReplyDraft | null;
  onClearReply?: () => void;
}

export function MessageComposer({
  conversationId,
  sessionExpired,
  onSend,
  onOpenTemplates,
  replyTo,
  onClearReply,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false); // ফাইল আপলোডিং স্টেট
  const [isRecording, setIsRecording] = useState(false); // অডিও রেকর্ডিং স্টেট
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldSendAudioRef = useRef<boolean>(true); // ভয়েস ক্যানসেল চেক করার জন্য

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Max 4 lines (~96px)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  // HTML5 Canvas ব্যবহার করে মিলি-সেকেন্ডে ইমেজ সাইজ রিডুস করার হেল্পার ফাংশন [1.2.6]
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 1200; // বড় ছবির রেজোলিউশন লিমিট করা
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.85); // ৮৫% কোয়ালিটি রেখে ফাইল সাইজ নাটকীয়ভাবে কমানো
        };
      };
    });
  };

  // ফাইল আপলোড ও মেটা এপিআই-তে সেন্ড করার রিয়েল-টাইম ড্রাইভার ফাংশন [1.2.3]
  const uploadAndSend = async (fileToUpload: File | Blob, messageType: 'image' | 'video' | 'audio' | 'document', originalName?: string) => {
    try {
      setUploading(true);
      let finalFile = fileToUpload;
      let finalName = originalName || (fileToUpload instanceof File ? fileToUpload.name : `voice-note-${Date.now()}.ogg`);

      // ১. যদি ছবি হয়, তবে ক্লায়েন্ট সাইডে তাৎক্ষণিকভাবে কম্প্রেস করা [1.2.6]
      if (messageType === 'image' && fileToUpload instanceof File) {
        
        const compressedBlob = await compressImage(fileToUpload);
        finalFile = new File([compressedBlob], finalName, { type: 'image/jpeg' });
      }

      // ২. ইউনিক ফাইল পাথ ডিফাইন করা
      const fileExtension = finalName.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      const filePath = `${conversationId}/${fileName}`;

      // ৩. সুপাবেস স্টোরেজে আপলোড [1.2.3]
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, finalFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[composer] upload failed:', uploadError);
        toast.error(`File upload failed: ${uploadError.message}`);
        return;
      }

      // ৪. ফাইলের পাবলিক লিংক সংগ্রহ করা [1.2.3]
      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      // ৫. ব্যাকএন্ড মেটা সেন্ড এপিআই কল [1.2.3]
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_type: messageType,
          media_url: publicUrl,
          content_text: finalName,
          reply_to_message_id: replyTo?.id || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const reason = payload?.error || `HTTP ${res.status}`;
        toast.error(`Failed to send file: ${reason}`);
        return;
      }

      toast.success(`${messageType.charAt(0).toUpperCase() + messageType.slice(1)} sent successfully!`);
      if (onClearReply) onClearReply();
    } catch (err) {
      console.error('[composer] send error:', err);
      toast.error("An unexpected error occurred during delivery.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || sessionExpired) return;

    setSending(true);
    try {
      onSend(trimmed, replyTo?.id);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionExpired, onSend, replyTo?.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      adjustHeight();
    },
    [adjustHeight]
  );

  // পেপারক্লিপ বাটন থেকে ফাইল পরিবর্তনের হ্যান্ডলার [1.2.3]
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let messageType: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (file.type.startsWith('image/')) {
      messageType = 'image';
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
    }

    await uploadAndSend(file, messageType);
  };

  // ভয়েস রেকর্ডিং শুরু করার ফাংশন [1.2.8]
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      shouldSendAudioRef.current = true;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!shouldSendAudioRef.current) return; // বাতিল করা হলে সেন্ড হবে না
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.ogg`, { type: 'audio/ogg' });
        
        await uploadAndSend(audioFile, 'audio', `voice-note-${Date.now()}.ogg`);
      };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started...");
    } catch (err) {
      console.error('Mic Access Error:', err);
      toast.error("Microphone access denied or not supported.");
    }
  };

  // ভয়েস রেকর্ডিং স্টপ এবং অটো-সেন্ড করার ফাংশন [1.2.8]
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // ভয়েস রেকর্ডিং বাতিল (Cancel) করার ফাংশন [1.2.8]
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      shouldSendAudioRef.current = false; // সেন্ড ফ্ল্যাগ ডিজেবল করা
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.error("Recording discarded.");
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900 p-3">
      {replyTo && (
        <div className="mb-2">
          <ReplyQuote
            authorLabel={replyTo.authorLabel}
            preview={replyTo.preview}
            onDismiss={onClearReply}
          />
        </div>
      )}
      {sessionExpired && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">
            24-hour session expired. Use a template to re-engage.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-400 hover:text-amber-300"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="mr-1 h-3 w-3" />
            Templates
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* হিডেন ফাইল ইনপুট */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />

        {/* টেমপ্লেট বাটন */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isRecording}
          className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-white"
          onClick={onOpenTemplates}
          title="Send template"
        >
          <LayoutTemplate className="h-4 w-4" />
        </Button>

        {/* পেপারক্লিপ বাটন (ডিজাইন একদম একই রাখা হয়েছে) */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={uploading || sessionExpired || isRecording}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-white"
          title="Attach file"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* অডিও রেকর্ডার বাটন প্যানেল (রেকর্ডিং সচল হলে ডাইনামিক লাইভ প্যানেল দেখাবে) */}
        {isRecording ? (
          <div className="flex h-9 items-center gap-3 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 animate-pulse shrink-0">
            <Square className="h-4 w-4 text-red-500 cursor-pointer shrink-0" onClick={stopRecording} title="Stop and Send" />
            <span className="text-[11px] font-semibold select-none">Rec...</span>
            <Trash2 className="h-4 w-4 text-slate-400 hover:text-white cursor-pointer shrink-0" onClick={cancelRecording} title="Discard Note" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={uploading || sessionExpired}
            onClick={startRecording}
            className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-white"
            title="Record voice note"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        {/* টেক্সট এরিয়া ইনপুট */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            sessionExpired
              ? "Session expired - use a template"
              : "Type a message... (Shift+Enter for new line)"
          }
          disabled={sessionExpired || isRecording}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-violet-500/50",
            (sessionExpired || isRecording) && "cursor-not-allowed opacity-50"
          )}
        />

        <Button
          size="sm"
          className="h-9 w-9 shrink-0 bg-violet-600 p-0 hover:bg-violet-500 disabled:opacity-40"
          disabled={!text.trim() || sessionExpired || sending || isRecording}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-1 pl-11 text-[10px] text-slate-600">
        Type &apos;/&apos; for quick replies
      </p>
    </div>
  );
}