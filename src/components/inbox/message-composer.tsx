"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, LayoutTemplate, Paperclip, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplyQuote } from "./reply-quote";
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
  const shouldSendAudioRef = useRef<boolean>(true); // ভয়েস ক্যানসেল চেক

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 1200;
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
          }, 'image/jpeg', 0.85);
        };
      };
    });
  };

  const uploadAndSend = async (fileToUpload: File | Blob, messageType: 'image' | 'video' | 'audio' | 'document', originalName?: string) => {
    try {
      setUploading(true);
      let finalFile = fileToUpload;
      // ফিক্স: 'let' এর জায়গায় 'const' ব্যবহার করে লিন্টার এরর সংশোধন করা হলো [1.1.2]
      const finalName = originalName || (fileToUpload instanceof File ? fileToUpload.name : `voice-note-${Date.now()}.webm`);

      if (messageType === 'image' && fileToUpload instanceof File) {
        toast.info("Compressing image for instant delivery...");
        const compressedBlob = await compressImage(fileToUpload);
        finalFile = new File([compressedBlob], finalName, { type: 'image/jpeg' });
      }

      const fileExtension = finalName.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
      const filePath = `${conversationId}/${fileName}`;

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

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      let extension = 'webm';
      
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        extension = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        extension = 'm4a';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      shouldSendAudioRef.current = true;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!shouldSendAudioRef.current) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
        
        await uploadAndSend(audioFile, 'audio', `voice-note-${Date.now()}.${extension}`);
      };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started...");
    } catch (err) {
      console.error('Mic Access Error:', err);
      toast.error("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      shouldSendAudioRef.current = false;
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
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />

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

        {isRecording ? (
          <div className="flex h-9 items-center gap-3 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 animate-pulse shrink-0">
            <span className="cursor-pointer shrink-0" onClick={stopRecording} title="Stop and Send">
              <Square className="h-4 w-4 text-red-500" />
            </span>
            <span className="text-[11px] font-semibold select-none">Rec...</span>
            <span className="cursor-pointer shrink-0" onClick={cancelRecording} title="Discard Note">
              <Trash2 className="h-4 w-4 text-slate-400 hover:text-white" />
            </span>
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