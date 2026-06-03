import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface IntegrationPayload {
  google_sheet_id: string
  apps_script_url?: string
}

// ১. কাস্টমারের গুগল শিট কনফিগারেশন রিড করার GET এপিআই
export async function GET() {
  try {
    const supabase = await createClient()
    
    // ইউজার সেশন চেক করা হচ্ছে
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

    // গুগল শিট সেটিংস রিড করা হচ্ছে
    const { data: integration, error: integrationError } = await supabase
      .from('workspace_integrations')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    if (integrationError) {
      console.error('[integrations-api] Database query error:', integrationError)
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
    }

    return NextResponse.json({ data: integration || null }, { status: 200 })
  } catch (err) {
    console.error('[integrations-api] GET catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ২. গুগল শিট কনফিগারেশন সেভ ও আপডেট (Upsert) করার POST এপিআই
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // ইউজার সেশন চেক
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ব্যবসার মালিক কিনা (is_approved === true) তা ভেরিফাই করা হচ্ছে
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('workspace_id, is_approved')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // মাল্টি-টেনেন্ট সিকিউরিটি প্রটেকশন: মালিক না হলে এডিট ব্লকড (403 Forbidden)
    if (!profile.is_approved) {
      return NextResponse.json(
        { error: 'Forbidden: Only approved Workspace Owners can manage integrations' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as IntegrationPayload
    const { google_sheet_id, apps_script_url } = body

    if (!google_sheet_id || !google_sheet_id.trim()) {
      return NextResponse.json({ error: 'Google Sheet ID is required' }, { status: 400 })
    }

    // ওনারের নিজস্ব ওয়ার্কস্পেস আইডিতে ডাটা সেভ/আপডেট করা হচ্ছে
    const { data: integration, error: upsertError } = await supabase
      .from('workspace_integrations')
      .upsert(
        {
          workspace_id: profile.workspace_id,
          google_sheet_id: google_sheet_id.trim(),
          apps_script_url: apps_script_url?.trim() || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'workspace_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[integrations-api] Database upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save integrations' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: integration }, { status: 200 })
  } catch (err) {
    console.error('[integrations-api] POST catch error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}