import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

// ১. এআই সেটিংস ও ডিক্রিপ্ট করা কী লোড করার সিকিউরড রুট [1.2.2]
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('openai_api_key, ai_prompt, ai_base_url, ai_model')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let decryptedApiKey = ''
    if (data?.openai_api_key) {
      try {
        // ডিক্রিপশন ব্যাকএন্ড সার্ভার এন্ডে অত্যন্ত নিরাপদে রান হবে
        decryptedApiKey = decrypt(data.openai_api_key)
      } catch (err) {
        console.warn('Failed to decrypt OpenAI API Key:', err)
      }
    }

    return NextResponse.json({
      apiKey: decryptedApiKey,
      prompt: data?.ai_prompt || 'You are a helpful customer service assistant.',
      baseUrl: data?.ai_base_url || 'https://api.openai.com/v1',
      model: data?.ai_model || 'gpt-4o-mini'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ২. ওনারের এপিআই কী সার্ভার-সাইডে এনক্রিপ্ট করে ডাটাবেসে সেভ করার রুট [1.2.2]
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey, prompt, baseUrl, model } = await request.json()

    // এনক্রিপশন প্রসেস ব্যাকএন্ডে সম্পন্ন হচ্ছে
    const encryptedKey = apiKey ? encrypt(apiKey) : null

    const { data: existingConfig } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingConfig) {
      const { error } = await supabase
        .from('whatsapp_config')
        .update({
          openai_api_key: encryptedKey,
          ai_prompt: prompt,
          ai_base_url: baseUrl,
          ai_model: model
        })
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('whatsapp_config')
        .insert({
          user_id: user.id,
          openai_api_key: encryptedKey,
          ai_prompt: prompt,
          ai_base_url: baseUrl,
          ai_model: model,
          phone_number_id: '',
          access_token: ''
        })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}