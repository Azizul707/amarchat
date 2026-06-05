import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

export const dynamic = 'force-dynamic'

interface TemplateButtonPayload {
  type: 'quick_reply' | 'url' | 'phone'
  text: string
  value: string
}

interface SubmitTemplatePayload {
  name: string
  category: string
  language: string
  body_text: string
  header_type: string
  header_content: string | null
  footer_text: string | null
  buttons: TemplateButtonPayload[] | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ১. ইউজার সেশন চেক করা
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as SubmitTemplatePayload
    const { name, category, language, body_text, header_type, header_content, footer_text, buttons } = body

    // ২. ওনার ও এজেন্ট উভয়ের নিরাপত্তা মেলাতে প্রোফাইল থেকে workspace_id রিড করা হচ্ছে
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // ৩. ডাইনামিক মাল্টি-টেনেন্ট ফিক্স: workspace_id দিয়ে মেটা কনফিগারেশন রিড করা হচ্ছে (এজেন্ট সেভ করলেও ওনারের ক্রেডেনশিয়াল কল হবে)
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('waba_id, access_token, workspace_id')
      .eq('workspace_id', profile.workspace_id) // workspace_id দিয়ে কুয়েরি
      .maybeSingle()

    if (configError || !config || !config.waba_id || !config.access_token) {
      return NextResponse.json({ error: 'WhatsApp configurations (WABA ID or Access Token) are missing for this workspace.' }, { status: 400 })
    }

    const decryptedAccessToken = decrypt(config.access_token)

    // ৪. মেটা গ্রাফ এপিআই পেলোড (Meta Graph API Components array) কনস্ট্রাক্ট করা
    const components: unknown[] = []

    // হেডার পার্ট (টেক্সট অথবা ইমেজ/মিডিয়া স্যাম্পল)
    if (header_type && header_type !== 'none') {
      if (header_type === 'text' && header_content) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: header_content
        })
      } else if (['image', 'video', 'document'].includes(header_type) && header_content) {
        components.push({
          type: 'HEADER',
          format: header_type.toUpperCase(),
          example: {
            header_handle: [header_content] // মেটা স্যাম্পল মিডিয়া রিভিউর জন্য এটি বাধ্যতামূলক
          }
        })
      }
    }

    // বডি টেক্সট পার্ট
    components.push({
      type: 'BODY',
      text: body_text
    })

    // ফুটার পার্ট
    if (footer_text) {
      components.push({
        type: 'FOOTER',
        text: footer_text
      })
    }

    // ইন্টারেক্টিভ কাস্টম মার্কেটিং বাটন পার্ট (Quick Reply, Call to Action URL & Phone)
    if (buttons && buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map((btn) => {
          if (btn.type === 'quick_reply') {
            return {
              type: 'QUICK_REPLY',
              text: btn.text
            }
          } else if (btn.type === 'url') {
            return {
              type: 'URL',
              text: btn.text,
              url: btn.value
            }
          } else {
            return {
              type: 'PHONE_NUMBER',
              text: btn.text,
              phone_number: btn.value
            }
          }
        })
      })
    }

    // ৫. সরাসরি মেটা গ্রাফ এপিআই (Meta Graph API v20.0)-তে সাবমিট করা
    console.log(`[meta-submit] Submitting template ${name} to WABA ID: ${config.waba_id}`)
    const metaUrl = `https://graph.facebook.com/v20.0/${config.waba_id}/message_templates`
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.toLowerCase(),
        language,
        category: category.toUpperCase(),
        components
      })
    })

    const metaData = await metaRes.json()

    if (!metaRes.ok) {
      console.error('[meta-submit] Meta API rejected template:', metaData)
      return NextResponse.json({ 
        error: metaData?.error?.message || 'Meta rejected the template creation request.' 
      }, { status: 400 })
    }

    // ৬. মেটা রিকোয়েস্ট গ্রহণ করলে, স্থানীয় ডাটাবেসে এটি "Pending" স্ট্যাটাসে সেভ করা
    const { error: dbError } = await supabase
      .from('message_templates')
      .insert({
        user_id: user.id,
        workspace_id: config.workspace_id,
        name: name.toLowerCase(),
        category,
        language,
        body_text,
        header_type: header_type === 'none' ? null : header_type,
        header_content,
        footer_text,
        buttons,
        status: 'Pending'
      })

    if (dbError) {
      console.error('[meta-submit] Failed to save local copy after successful Meta submit:', dbError.message)
      return NextResponse.json({ error: 'Template approved by Meta but local database save failed.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, meta_response: metaData }, { status: 200 })
  } catch (err) {
    console.error('[meta-submit] Server crash error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}