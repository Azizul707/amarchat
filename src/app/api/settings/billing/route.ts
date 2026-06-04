import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BillingPayload {
  payment_method: string
  sender_number: string
  transaction_id: string
  selected_plan: string
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

    // নতুন পেন্ডিং পেমেন্ট রিকোয়েস্ট ডাটাবেসে সেভ করা হচ্ছে
    const { data: newRequest, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        user_id: user.id,
        workspace_id: profile.workspace_id,
        payment_method: payment_method.trim().toLowerCase(),
        sender_number: sender_number.trim(),
        transaction_id: transaction_id.trim().toUpperCase(), // ট্রানজেকশন আইডি বড় হাতের অক্ষরে সেভ করা হচ্ছে
        selected_plan: selected_plan.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[billing-api] Insert error:', insertError)
      
      // ডুপ্লিকেট ট্রানজেকশন আইডি (Unique Constraint - 23505) এরর হ্যান্ডলিং
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'This Transaction ID (TxnID) has already been submitted for verification.' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to submit billing verification request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newRequest }, { status: 200 })
  } catch (err) {
    console.error('[billing-api] POST catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}