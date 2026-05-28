import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

// GET - এআই কনফিগারেশন রিড করা (শুধুমাত্র এপ্রুভড ওনার ডিক্রিপ্ট করা কি দেখতে পাবেন)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ওনার ভেরিফিকেশন (is_approved === true চেক)
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id, is_approved')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile || !profile.is_approved) {
      return NextResponse.json({ error: 'Unauthorized: Only approved owners can access AI settings' }, { status: 401 })
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 })
    }

    if (!config) {
      return NextResponse.json({}, { status: 200 })
    }

    // এপিআই কি ডিক্রিপ্ট করে পাঠানো হচ্ছে (শুধুমাত্র এপ্রুভড ওনার ব্রাউজারে দেখতে পাবেন)
    const decryptedApiKey = config.openai_api_key ? decrypt(config.openai_api_key) : ''

    return NextResponse.json({
      apiKey: decryptedApiKey,
      prompt: config.ai_prompt || '',
      baseUrl: config.ai_base_url || '',
      model: config.ai_model || '',
    }, { status: 200 })
  } catch (err) {
    console.error('GET AI Settings Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - এআই কনফিগারেশন সেভ/আপডেট করা (শুধুমাত্র এপ্রুভড ওনার ডাটা সেভ করতে পারবেন)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ওনার ভেরিফিকেশন (is_approved === true চেক)
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id, is_approved')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile || !profile.is_approved) {
      return NextResponse.json({ error: 'Unauthorized: Only approved owners can save AI settings' }, { status: 401 })
    }

    const { apiKey, prompt, baseUrl, model } = await request.json()

    // এপিআই কি এনক্রিপ্ট করে সিকিউরডভাবে ডাটাবেজে সেভ করা হচ্ছে
    const encryptedApiKey = apiKey ? encrypt(apiKey) : ''

    // ডাটাবেজে আগে থেকে কনফিগ আছে কি না চেক
    const { data: existingConfig } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    let dbError = null

    if (existingConfig) {
      // কনফিগ থাকলে আপডেট করা হচ্ছে
      const { error } = await supabase
        .from('whatsapp_config')
        .update({
          openai_api_key: encryptedApiKey,
          ai_prompt: prompt,
          ai_base_url: baseUrl,
          ai_model: model,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', profile.workspace_id)
      dbError = error
    } else {
      // কনফিগ না থাকলে নতুন ইনসার্ট করা হচ্ছে
      const { error } = await supabase
        .from('whatsapp_config')
        .insert({
          workspace_id: profile.workspace_id,
          user_id: user.id,
          openai_api_key: encryptedApiKey,
          ai_prompt: prompt,
          ai_base_url: baseUrl,
          ai_model: model,
        })
      dbError = error
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('POST AI Settings Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}