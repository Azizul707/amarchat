import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Train AI (নলেজ বেস যুক্ত করা এবং ভেক্টর তৈরি করা)
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

    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: 'text-embedding-3-small',
      }),
    })

    if (!embeddingRes.ok) {
      const err = await embeddingRes.json().catch(() => ({}))
      console.error('OpenAI Embeddings error:', err)
      return NextResponse.json({ error: 'Failed to generate embeddings' }, { status: 500 })
    }

    const embeddingData = await embeddingRes.json()
    const embeddingVector = embeddingData.data[0].embedding

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
      .eq('workspace_id', profile.workspace_id) // এজেন্টরা যাতে অন্য ওয়ার্কস্পেসের ডাটা ডিলিট করতে না পারে

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'deleted' }, { status: 200 })
  } catch (err) {
    console.error('Delete Knowledge Base Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}