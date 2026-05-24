import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance — shared across the whole browser session.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Next.js App Router-এর এগ্রেসিভ ক্যাশিং বাইপাস করার জন্য cache: 'no-store' সেট করা হয়েছে
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            cache: 'no-store', // প্রতিটি কুয়েরি সরাসরি লাইভ ডাটাবেস থেকে ফ্রেশ ডেটা আনবে
          });
        },
      },
    }
  )

  return browserClient;
}