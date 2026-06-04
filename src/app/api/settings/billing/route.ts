import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface BillingPayload {
  payment_method: string
  sender_number: string
  transaction_id: string
  selected_plan: string
}

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

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error: queryError } = await supabase
      .from('payment_requests')
      .select('id, payment_method, sender_number, transaction_id, selected_plan, status, created_at')
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    if (!payment_method || !sender_number.trim() || !transaction_id.trim() || !selected_plan) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const cleanTxnId = transaction_id.trim().toUpperCase()

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
      
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'This Transaction ID (TxnID) has already been submitted for verification.' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to submit billing verification request' }, { status: 500 })
    }

    // **৩. সুরক্ষিত সিঙ্ক্রোনাস ওয়েটিং মেকানিজম** (Vercel Container Freeze Protection)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (botToken && chatId) {
      // এপিআই কল সম্পূর্ণ শেষ হওয়া পর্যন্ত অপেক্ষা (Await) করা হবে
      await sendTelegramAlert(
        botToken,
        chatId,
        selected_plan,
        payment_method,
        sender_number,
        cleanTxnId,
        user.email || 'N/A'
      )
    }

    return NextResponse.json({ success: true, data: newRequest }, { status: 200 })
  } catch (err) {
    console.error('[billing-api] POST catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}