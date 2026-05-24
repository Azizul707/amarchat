"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message, Contact, ConversationStatus } from "@/types";
import { useRealtime } from "@/hooks/use-realtime";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageThread } from "@/components/inbox/message-thread";
import { ContactSidebar } from "@/components/inbox/contact-sidebar";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // Sonner টোস্ট নোটিফিকেশন ইমপোর্ট করা হলো

export default function InboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkConvId = searchParams.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(
    null
  );
  
  // বর্তমানে লগইন করা এজেন্টের ইউজার আইডি ট্র্যাক করার স্টেট
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // স্টেল ক্লোজার এড়াতে লগইন করা ইউজারের আইডি ট্র্যাক করার Ref
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Deep-link selection safeguard ref
  const autoSelectedForDeepLinkRef = useRef<string | null>(null);

  // Check WhatsApp connection status on mount এবং লগইন করা এজেন্টের আইডি রিট্রিভ
  useEffect(() => {
    const checkConnection = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return;
      
      // লগইন করা এজেন্টের আইডি সেভ করা হলো
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("whatsapp_config")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      setWhatsappConnected(data?.status === "connected");
    };

    checkConnection();
  }, []);

  // রিয়েল-টাইম মেসেজ ইভেন্ট হ্যান্ডলার
  const handleMessageEvent = useCallback(
    (event: { eventType: string; new: Message; old: Partial<Message> }) => {
      const newMsg = event.new;
      const currentActiveConv = activeConversationRef.current;

      if (event.eventType === "INSERT") {
        if (
          currentActiveConv &&
          newMsg.conversation_id === currentActiveConv.id
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const withoutOptimistic = prev.filter(
              (m) => !m.id.startsWith("temp-")
            );
            return [...withoutOptimistic, newMsg];
          });
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === newMsg.conversation_id
              ? {
                  ...c,
                  last_message_text: newMsg.content_text ?? "",
                  last_message_at: newMsg.created_at,
                  unread_count:
                    currentActiveConv?.id === newMsg.conversation_id
                      ? 0
                      : c.unread_count + 1,
                }
              : c
          )
        );
      }

      if (event.eventType === "UPDATE") {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m))
        );
      }
    },
    []
  );

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      if (activeConversation?.id === conv.id) return;
      setActiveConversation(conv);
      setActiveContact(conv.contact ?? null);
      setMessages([]);
      autoSelectedForDeepLinkRef.current = conv.id;
      router.replace(`/inbox?c=${conv.id}`, { scroll: false });
    },
    [activeConversation?.id, router]
  );

  // রিয়েল-টাইম কনভারসেশন ইভেন্ট হ্যান্ডলার
  const handleConversationEvent = useCallback(
    (event: {
      eventType: string;
      new: Conversation;
      old: Partial<Conversation>;
    }) => {
      const conv = event.new;
      const oldConv = event.old;
      const currentActiveConv = activeConversationRef.current;
      const loggedInUserId = currentUserIdRef.current;

      if (event.eventType === "INSERT") {
        setConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) {
            return prev;
          }
          return [conv, ...prev];
        });
      }

      if (event.eventType === "UPDATE") {
        // চ্যাট অ্যাসাইনমেন্ট ডিটেক্টর: যদি অন্য কেউ চ্যাটটি এই এজেন্টের আন্ডারে এসাইন করে
        if (
          conv.assigned_agent_id === loggedInUserId &&
          oldConv?.assigned_agent_id !== loggedInUserId
        ) {
          // Sonner টোস্ট নোটিফিকেশন ট্রিগার করা হলো
          toast.info("A new chat has been assigned to you!", {
            description: `Customer: ${conv.contact?.name || conv.contact?.phone || "Unknown Customer"}`,
            action: {
              label: "Open Chat",
              onClick: () => handleSelectConversation(conv),
            },
          });

          // মিষ্টি নোটিফিকেশন সাউন্ড প্লে করা হলো (public/sounds ফোল্ডারে ফাইলটি থাকতে হবে)
          const audio = new Audio("/sounds/notification.mp3");
          audio.play().catch(() => {
            // ব্রাউজার যদি অটো-প্লে ব্লক করে তবে সাইলেন্টলি হ্যান্ডেল করবে
          });
        }

        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
        );

        if (currentActiveConv && conv.id === currentActiveConv.id) {
          setActiveConversation((prev) =>
            prev ? { ...prev, ...conv } : prev
          );
        }
      }
    },
    [handleSelectConversation]
  );

  // Subscribe to Supabase Realtime channel
  useRealtime({
    channelName: "inbox-realtime",
    onMessageEvent: handleMessageEvent,
    onConversationEvent: handleConversationEvent,
    enabled: true,
  });

  const handleConversationsLoaded = useCallback(
    (loaded: Conversation[]) => {
      const uniqueConversations = loaded.filter(
        (conv, index, self) => self.findIndex((c) => c.id === conv.id) === index
      );
      setConversations(uniqueConversations);

      if (
        deepLinkConvId &&
        autoSelectedForDeepLinkRef.current !== deepLinkConvId &&
        loaded.length > 0
      ) {
        autoSelectedForDeepLinkRef.current = deepLinkConvId;
        if (activeConversation?.id === deepLinkConvId) return;
        const match = loaded.find((c) => c.id === deepLinkConvId);
        if (match) {
          setActiveConversation(match);
          setActiveContact(match.contact ?? null);
          setMessages([]);
        }
      }
    },
    [deepLinkConvId, activeConversation?.id]
  );

  const handleCloseConversation = useCallback(() => {
    setActiveConversation(null);
    setActiveContact(null);
    setMessages([]);
    autoSelectedForDeepLinkRef.current = null;
    router.replace("/inbox", { scroll: false });
  }, [router]);

  const handleMessagesLoaded = useCallback((loaded: Message[]) => {
    setMessages(loaded);
  }, []);

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleUpdateMessage = useCallback(
    (id: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const handleStatusChange = useCallback(
    (conversationId: string, status: ConversationStatus) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, status } : c))
      );
      if (activeConversationRef.current?.id === conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, status } : prev));
      }
    },
    []
  );

  const handleAssignChange = useCallback(
    (conversationId: string, assignedAgentId: string | null) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, assigned_agent_id: assignedAgentId ?? undefined }
            : c
        )
      );
      if (activeConversationRef.current?.id === conversationId) {
        setActiveConversation((prev) =>
          prev
            ? { ...prev, assigned_agent_id: assignedAgentId ?? undefined }
            : prev
        );
      }
    },
    []
  );

  const hasActiveConv = !!activeConversation;

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden sm:-m-6">
      {whatsappConnected === false && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <WifiOff className="h-4 w-4 text-amber-400" />
          <p className="text-xs text-amber-400">
            WhatsApp® is not connected. Go to Settings to connect your account.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full flex-1 lg:flex-none",
            hasActiveConv ? "hidden lg:flex" : "flex",
          )}
        >
          <ConversationList
            activeConversationId={activeConversation?.id ?? null}
            onSelect={handleSelectConversation}
            conversations={conversations}
            onConversationsLoaded={handleConversationsLoaded}
          />
        </div>

        <div
          className={cn(
            "flex h-full flex-1 lg:flex",
            hasActiveConv ? "flex" : "hidden lg:flex",
          )}
        >
          <MessageThread
            key={activeConversation ? `thread-${activeConversation.id}` : "thread-empty"}
            conversation={activeConversation}
            contact={activeContact}
            messages={messages}
            onMessagesLoaded={handleMessagesLoaded}
            onNewMessage={handleNewMessage}
            onUpdateMessage={handleUpdateMessage}
            onStatusChange={handleStatusChange}
            onAssignChange={handleAssignChange}
            onBack={handleCloseConversation}
          />
        </div>

        <div className="hidden lg:block">
          <ContactSidebar contact={activeContact} />
        </div>
      </div>
    </div>
  );
}