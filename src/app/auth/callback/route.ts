import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // আমাদের অপ্টিমাইজড করা সার্ভার ক্লায়েন্ট

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // পাসওয়ার্ড রিসেট হলে redirect target হবে '/reset-password', অন্যথায় ড্যাশবোর্ড
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // PKCE কোডটি এক্সচেঞ্জ করে ইউজারের জন্য অথেনটিকেটেড সেশন কুকি সেট করা হবে
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // সেশন তৈরি সফল হলে নির্দিষ্ট নেক্সট পাথে (যেমন: /reset-password) রিডাইরেক্ট হবে
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error('Code exchange failed:', error.message)
  }

  // কোনো কারণে কোড এক্সচেঞ্জ ফেইল হলে ইউজারকে সরাসরি এরর প্যারামিটারসহ লগইন পেজে পাঠানো হবে
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}