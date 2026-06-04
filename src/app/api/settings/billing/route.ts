import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BillingPayload {
  payment_method: string
  sender_number: string
  transaction_id: string
  selected_plan: string
}

// আপনার টেলিগ্রাম আইডিতে স্বয়ংক্রিয় পুশ নোটিফিকেশন পাঠানোর ড্রাইভার ফাংশন
async function sendTelegramAlert(
  token: string,
  chatId: string,
  plan: string,
  method: string,
  sender: string,
  txId: string,
  email: string
) {
  try {
    const text = `🔔 *New Payment Request Received!*
    
*Plan:* ${plan}
*Method:* ${method.toUpperCase()}
*Sender:* \`${sender}\`
*TxnID:* \`${txId}\`
*User Email:* \`${email}\`

_Please verify the Transaction ID on your phone and manually approve this user from Supabase._`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[telegram-notify] API responded with error:', err)
    } else {
      console.log('[telegram-notify] Push notification dispatched successfully.')
    }
  } catch (err) {
    console.error('[telegram-notify] Failed to dispatch push notification:', err)
  }
}

// ১. কাস্টমারের পূর্ববর্তী পেমেন্ট রিকোয়েস্টগুলোর স্ট্যাটাস রিড করার GET এপিআই
export async function GET() {
  try {
    const supabase = await createClient()
    
    // ইউজার সেশন চেক
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // শুধুমাত্র এই নির্দিষ্ট ইউজারের পেমেন্ট রিকোয়েস্টগুলো ফিল্টার করে আনা হচ্ছে
    const { data: requests, error: queryError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[billing-api] Fetch error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch billing requests' }, { status: 500 })
    }

    return NextResponse.json({ data: requests || [] }, { status: 200 })
  } catch (err) {
    console.error('[billing-api] GET catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ২. কাস্টমারের নতুন পেমেন্ট ভেরিফিকেশন রিকোয়েস্ট সাবমিট করার POST এপিআই
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // ইউজার সেশন চেক
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ইউজারের প্রোফাইল থেকে workspace_id নেওয়া হচ্ছে
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const body = (await request.json()) as BillingPayload
    const { payment_method, sender_number, transaction_id, selected_plan } = body

    // ফর্ম ভ্যালিডেশন চেক
    if (!payment_method || !sender_number.trim() || !transaction_id.trim() || !selected_plan) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const cleanTxnId = transaction_id.trim().toUpperCase()

    // নতুন পেন্ডিং পেমেন্ট রিকোয়েস্ট ডাটাবেসে সেভ করা হচ্ছে
    const { data: newRequest, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        user_id: user.id,
        workspace_id: profile.workspace_id,
        payment_method: payment_method.trim().toLowerCase(),
        sender_number: sender_number.trim(),
        transaction_id: cleanTxnId,
        selected_plan: selected_plan.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[billing-api] Insert error:', insertError)
      
      // ডুপ্লিকেট ট্রানজেকশন আইডি (Unique Constraint) এরর হ্যান্ডলিং
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'This Transaction ID (TxnID) has already been submitted for verification.' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to submit billing verification request' }, { status: 500 })
    }

    // **৩. সুরক্ষিত ব্যাকগ্রাউন্ড টেলিগ্রাম পুশ অ্যালার্ট ট্রিগার**
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (botToken && chatId) {
      // ফায়ার অ্যান্ড ফরগেট (Background execution)
      sendTelegramAlert(
        botToken,
        chatId,
        selected_plan,
        payment_method,
        sender_number,
        cleanTxnId,
        user.email || 'N/A'
      ).catch((err) => console.error('[telegram-notify] Background trigger error:', err))
    } else {
      console.warn('[telegram-notify] Missing process.env configuration. Push skipped.')
    }

    return NextResponse.json({ success: true, data: newRequest }, { status: 200 })
  } catch (err) {
    console.error('[billing-api] POST catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}