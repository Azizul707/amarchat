import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

// POST - Train AI (ডাউনলোড এবং ওনারের নিজস্ব ডাইনামিক এপিআই কি ও গেটওয়ে দিয়ে ভেক্টর তৈরি করা)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content text is required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // ১. ওনারের সেভ করা whatsapp_config থেকে এনক্রিপ্ট করা এপিআই কি ও কাস্টম বেস ইউআরএল রিট্রাইভ করা
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('openai_api_key, ai_base_url') // ai_base_url রিট্রাইভ করা হচ্ছে
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    if (configError || !config || !config.openai_api_key) {
      return NextResponse.json({ 
        error: 'OpenAI API Key is not configured. Please set your API Key in the AI Chatbot settings tab first.' 
      }, { status: 400 })
    }

    const decryptedApiKey = decrypt(config.openai_api_key)

    if (!decryptedApiKey) {
      return NextResponse.json({ error: 'Failed to decrypt your OpenAI API Key.' }, { status: 500 })
    }

    // ২. কাস্টমার বা ওনারের সেভ করা কাস্টম এআই বেস ইউআরএল অনুযায়ী এমবেডিংস এপিআই পাথ তৈরি
    const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
    const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
    const embeddingsUrl = `${sanitizedBaseUrl}/embeddings` // ডাইনামিক এপিআই গেটওয়ে পাথ

    // ৩. কাস্টমার যদি ওপেনরাউটার ব্যবহার করে তবে তারembeddings মডেল নেম অটোমেটিক কনভার্ট হবে
    const embeddingModel = aiBaseUrl.includes('openrouter') 
      ? 'openai/text-embedding-3-small' 
      : 'text-embedding-3-small'

    // ৪. ওনারের নিজস্ব ডাইনামিক এপিআই কি এবং এপিআই এন্ডপয়েন্ট দিয়ে ভেক্টর জেনারেট করা হচ্ছে
    const embeddingRes = await fetch(embeddingsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedApiKey}`, // ডিক্রিপ্ট করা কাস্টমার নিজস্ব কি
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: embeddingModel,
      }),
    })

    if (!embeddingRes.ok) {
      const err = await embeddingRes.json().catch(() => ({}))
      console.error('Embeddings generation failed:', err)
      return NextResponse.json({ error: 'Failed to generate embeddings' }, { status: 500 })
    }

    const embeddingData = await embeddingRes.json()
    const embeddingVector = embeddingData.data[0].embedding

    // ৫. ভেক্টরসহ ডাটাবেজে নলেজ সেভ করা হচ্ছে
    const { error: dbError } = await supabase.from('knowledge_base').insert({
      workspace_id: profile.workspace_id,
      content: content,
      embedding: embeddingVector,
    })

    if (dbError) {
      console.error('Database save failed:', dbError.message)
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 })
    }

    return NextResponse.json({ status: 'trained' }, { status: 200 })
  } catch (err) {
    console.error('Knowledge Base Train Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - সুনির্দিষ্ট ওয়ার্কস্পেসের ইতিমধ্যে ট্রেইন্ড হওয়া নলেজ বেসের লিস্ট রিটার্ন করবে
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

    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, content, created_at')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error('Get Knowledge Base Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - ট্রেইন্ড হওয়া কোনো নির্দিষ্ট নলেজ ডকুমেন্ট মুছে ফেলা
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('workspace_id', profile.workspace_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'deleted' }, { status: 200 })
  } catch (err) {
    console.error('Delete Knowledge Base Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}