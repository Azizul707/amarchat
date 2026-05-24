"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Conversation } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeEvent<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
}

interface UseRealtimeOptions {
  channelName: string;
  onMessageEvent?: (event: RealtimeEvent<Message>) => void;
  onConversationEvent?: (event: RealtimeEvent<Conversation>) => void;
  enabled?: boolean;
}

export function useRealtime({
  channelName,
  onMessageEvent,
  onConversationEvent,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onMessageRef = useRef(onMessageEvent);
  const onConversationRef = useRef(onConversationEvent);
  
  // Guard ref to deduplicate rapid SIGNED_IN triggers in production
  const lastAuthStateRef = useRef<string | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessageEvent;
    onConversationRef.current = onConversationEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let isMounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    const startSubscription = () => {
      if (channelRef.current) {
        console.log("ℹ️ Realtime channel already exists. Skipping duplicate subscription.");
        return;
      }

      console.log("🚀 Attempting to subscribe to channel:", channelName);

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            console.log("📨 REALTIME NEW MESSAGE RECEIVED:", payload);
            onMessageRef.current?.({
              eventType: payload.eventType as RealtimeEvent<Message>["eventType"],
              new: payload.new as Message,
              old: payload.old as Partial<Message>,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          (payload) => {
            console.log("💬 REALTIME CONVERSATION UPDATE RECEIVED:", payload);
            onConversationRef.current?.({
              eventType: payload.eventType as RealtimeEvent<Conversation>["eventType"],
              new: payload.new as Conversation,
              old: payload.old as Partial<Conversation>,
            });
          }
        )
        .subscribe((status, err) => {
          console.log("🔔 REALTIME SUBSCRIPTION STATUS:", status);
          if (err) {
            console.error("❌ REALTIME SUBSCRIPTION ERROR:", err);
          }
          if (isMounted) {
            setIsConnected(status === "SUBSCRIBED");
          }
        });

      channelRef.current = channel;
    };

    // Fast check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isMounted) {
        startSubscription();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Guard: Skip if the auth state transition is identical to the previous one
      // সেশন এক্সপায়ার বা রিনিউ টোকেন ফায়ার হলে যেন সাবস্ক্রিপশন সাইলেন্টলি অফ না হয়ে যায়, সেজন্য TOKEN_REFRESHED কে ছাড় দেওয়া হয়েছে
      if (lastAuthStateRef.current === event && event !== "TOKEN_REFRESHED") {
        console.log(`[Auth] Ignoring duplicate ${event} event to protect channel state`);
        return;
      }

      console.log(`🔐 [Auth] Verified State transition: ${event}`);
      lastAuthStateRef.current = event;

      if (session && isMounted) {
        startSubscription();
      } else if (!session && isMounted) {
        if (channelRef.current) {
          console.log("🔌 Removing channel due to session expiration.");
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsConnected(false);
        }
      }
    });
    
    unsubscribeAuth = subscription.unsubscribe;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      setIsConnected(false);
    };
  }, [channelName, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, unsubscribe };
}