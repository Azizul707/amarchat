import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

export const dynamic = 'force-dynamic'

// GET - ডাটাবেজ থেকে শুধুমাত্র এআই কনফিগ লোড এবং ডিক্রিপ্ট করা (মেটা সিক্রেট মুক্ত)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('openai_api_key, ai_prompt, ai_base_url, ai_model')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    let decryptedApiKey = ''

    if (config && config.openai_api_key) {
      try {
        decryptedApiKey = decrypt(config.openai_api_key)
      } catch (err) {
        console.error('Failed to decrypt OpenAI API Key:', err)
      }
    }

    return NextResponse.json({
      apiKey: decryptedApiKey,
      prompt: config?.ai_prompt || 'You are a helpful customer service assistant.',
      baseUrl: config?.ai_base_url || 'https://api.openai.com/v1',
      model: config?.ai_model || 'gpt-4o-mini',
    }, { status: 200 })
  } catch (err) {
    console.error('GET AI Config Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - এআই কনফিগ ডাটাবেজে এনক্রিপ্ট করে সেভ/আপসেট করা (মেটা সিক্রেট মুক্ত)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey, prompt, baseUrl, model } = await request.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    let encryptedApiKey = ''

    if (apiKey) {
      encryptedApiKey = encrypt(apiKey)
    }

    const { error } = await supabase
      .from('whatsapp_config')
      .upsert({
        workspace_id: profile.workspace_id,
        user_id: user.id,
        openai_api_key: encryptedApiKey,
        ai_prompt: prompt,
        ai_base_url: baseUrl,
        ai_model: model,
        status: 'active'
      }, {
        onConflict: 'workspace_id'
      })

    if (error) {
      console.error('Failed to save AI config:', error.message)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('POST AI Config Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}