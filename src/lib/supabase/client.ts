import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // ব্রাউজার, নেক্সট.জেএস এবং Vercel CDN এর এগ্রেসিভ ক্যাশিং এড়াতে URL-এ টাইমস্ট্যাম্প যুক্ত করা হলো
        fetch: (url, options) => {
          try {
            const urlObj = new URL(url.toString());
            
            // শুধুমাত্র GET রিকোয়েস্টগুলোর জন্য টাইমস্ট্যাম্প প্যারামিটার যুক্ত করা হলো
            if (!options?.method || options.method.toUpperCase() === 'GET') {
              urlObj.searchParams.set('t', Date.now().toString());
            }
            
            return fetch(urlObj.toString(), {
              ...options,
              cache: 'no-store', // Next.js ক্যাশ বাইপাস করার জন্য
            });
          } catch {
            // কোনো কারণে URL পার্স করতে সমস্যা হলে ডিফল্ট ফেচ কল হবে
            return fetch(url, {
              ...options,
              cache: 'no-store',
            });
          }
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      }
    }
  )

  return browserClient
}