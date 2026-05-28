import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

// নেক্সট.জেএস এবং Vercel এর এপিআই গেট (GET) ক্যাশিং সম্পূর্ণরূপে বন্ধ করার জন্য ডাইনামিক এক্সপোর্ট যুক্ত করা হলো
export const dynamic = 'force-dynamic'

// POST - Train AI (strictly 1-to-1 upsert per workspace_id)
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

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('openai_api_key, ai_base_url')
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

    const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
    const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
    const embeddingsUrl = `${sanitizedBaseUrl}/embeddings`

    const embeddingModel = aiBaseUrl.includes('openrouter') 
      ? 'openai/text-embedding-3-small' 
      : 'text-embedding-3-small'

    const embeddingRes = await fetch(embeddingsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedApiKey}`,
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

    // ১-টু-১ মেকানিজম: আগে থেকে কোনো নলেজ বেস আছে কি না চেক
    const { data: existingDoc } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    let dbError = null

    if (existingDoc) {
      // আগের ডাটা নতুন ডাটা দিয়ে সম্পূর্ণ রিপ্লেস/আপডেট করা হচ্ছে
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          content: content,
          embedding: embeddingVector,
          created_at: new Date().toISOString(),
        })
        .eq('workspace_id', profile.workspace_id)
      dbError = error
    } else {
      // নতুন ডাটা ইনসার্ট
      const { error } = await supabase.from('knowledge_base').insert({
        workspace_id: profile.workspace_id,
        content: content,
        embedding: embeddingVector,
      })
      dbError = error
    }

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

// GET - সুনির্দিষ্ট ওয়ার্কস্পেসের ১টি ইউনিক ডক রিটার্ন করবে
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
      .maybeSingle() // ১টি ডকই সিলেক্ট করা হচ্ছে

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || null, { status: 200 })
  } catch (err) {
    console.error('Get Knowledge Base Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - সম্পূর্ণ নলেজ বেস ডাটাবেজ থেকে মুছে ফেলা
export async function DELETE() {
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

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('workspace_id', profile.workspace_id) // ওনারের সব নলেজ একবারে ক্লিয়ার করবে

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'deleted' }, { status: 200 })
  } catch (err) {
    console.error('Delete Knowledge Base Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}