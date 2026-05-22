import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextMessage, sendTemplateMessage } from '@/lib/whatsapp/meta-api'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ১. কারেন্ট লগইন করা ইউজারের (ওনার বা এজেন্ট) অথ সেশন নিশ্চিত করা
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ২. রিয়েল-টাইম ওয়ার্কস্পেসের মেম্বারশিপ এবং ওনারের আইডি বের করা
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile || !profile.workspace_id) {
      return NextResponse.json(
        { error: 'Workspace profile not found. Please setup profile.' },
        { status: 400 }
      )
    }

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', profile.workspace_id)
      .maybeSingle()

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: 'Active workspace configuration not found.' },
        { status: 400 }
      )
    }

    // Per-user rate limit.
    const limit = checkRateLimit(`send:${user.id}`, RATE_LIMITS.send)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const {
      conversation_id,
      message_type, // 'text', 'template', 'image', 'video', 'audio', 'document'
      content_text,
      media_url,
      template_name,
      template_params,
      reply_to_message_id,
    } = body

    if (!conversation_id || !message_type) {
      return NextResponse.json(
        { error: 'conversation_id and message_type are required' },
        { status: 400 }
      )
    }

    if (message_type === 'text' && !content_text) {
      return NextResponse.json(
        { error: 'content_text is required for text messages' },
        { status: 400 }
      )
    }

    if (message_type === 'template' && !template_name) {
      return NextResponse.json(
        { error: 'template_name is required for template messages' },
        { status: 400 }
      )
    }

    // মিডিয়া মেসেজগুলোর জন্য লিংক থাকা বাধ্যতামূলক
    if (['image', 'video', 'audio', 'document'].includes(message_type) && !media_url) {
      return NextResponse.json(
        { error: `media_url is required for ${message_type} messages` },
        { status: 400 }
      )
    }

    // ৩. কনভারসেশন কুয়েরি: ওয়ার্কস্পেস আইডি দিয়ে কুয়েরি করা হবে [1]
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .eq('workspace_id', profile.workspace_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const contact = conversation.contact
    if (!contact?.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 400 }
      )
    }

    // Sanitize and validate phone
    const sanitizedPhone = sanitizePhoneForMeta(contact.phone)
    if (!isValidE164(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // ৪. কনফিগ কুয়েরি: ওয়ার্কস্পেস ওনারের আইডির বিপরীতে কনফিগারেশন ও টোকেন রিট্রিভ করা [1]
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', workspace.owner_id)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Please set up your WhatsApp integration first.' },
        { status: 400 }
      )
    }

    const accessToken = decrypt(config.access_token)

    // Self-heal legacy CBC-encrypted tokens.
    if (isLegacyFormat(config.access_token)) {
      void supabase
        .from('whatsapp_config')
        .update({ access_token: encrypt(accessToken) })
        .eq('id', config.id)
        .then(({ error }) => {
          if (error) {
            console.warn(
              '[whatsapp/send] access_token GCM upgrade failed:',
              error.message,
            )
          }
        })
    }

    // Resolve the reply target (if any) to its Meta message_id
    let contextMessageId: string | undefined
    if (reply_to_message_id) {
      const { data: parent, error: parentError } = await supabase
        .from('messages')
        .select('message_id, conversation_id')
        .eq('id', reply_to_message_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'reply_to_message_id not found in this conversation' },
          { status: 400 }
        )
      }
      if (!parent.message_id) {
        console.warn(
          '[whatsapp/send] reply target has no Meta message_id; sending without context'
        )
      } else {
        contextMessageId = parent.message_id
      }
    }

    // ৫. মেটা এপিআই-এর মাধ্যমে টেক্সট, টেমপ্লেট অথবা মিডিয়া মেসেজ পাঠানো
    let waMessageId = ''
    let workingPhone = sanitizedPhone

    const attempt = async (phone: string): Promise<string> => {
      // ক) অফিশিয়াল টেমপ্লেট মেসেজ পাঠানো
      if (message_type === 'template') {
        const result = await sendTemplateMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to: phone,
          templateName: template_name,
          params: template_params || [],
          contextMessageId,
        })
        return result.messageId
      }

      // খ) অফিশিয়াল মিডিয়া মেসেজ পাঠানো (ইমেজ, ভিডিও, অডিও, ডকুমেন্ট)
      if (['image', 'video', 'audio', 'document'].includes(message_type)) {
        const url = `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`
        
        // মেটার অফিশিয়াল মিডিয়া লিঙ্ক পেলোড তৈরি করা
        const payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: message_type,
          [message_type]: {
            link: media_url,
            // ডকুমেন্টের ক্ষেত্রে ফাইলের নাম সেট করা
            ...(message_type === 'document' && { filename: content_text || 'Document' }),
            // ইমেজ বা ভিডিওর সাথে ক্যাপশন টেক্সট থাকলে তা পাস করা
            ...(message_type === 'image' && content_text && { caption: content_text }),
            ...(message_type === 'video' && content_text && { caption: content_text }),
          },
        }

        if (contextMessageId) {
          payload.context = { message_id: contextMessageId }
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        })

        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData?.error?.message || `Meta API media send failed with HTTP ${response.status}`)
        }

        return resData.messages?.[0]?.id || ''
      }

      // গ) সাধারণ টেক্সট মেসেজ পাঠানো
      const result = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: phone,
        text: content_text,
        contextMessageId,
      })
      return result.messageId
    }

    try {
      const variants = phoneVariants(sanitizedPhone)
      let lastError: unknown = null

      for (const variant of variants) {
        try {
          waMessageId = await attempt(variant)
          workingPhone = variant
          lastError = null
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (!isRecipientNotAllowedError(message)) {
            throw err
          }
          lastError = err
          console.warn(`[whatsapp/send] variant "${variant}" rejected by Meta, trying next…`)
        }
      }

      if (lastError) throw lastError
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API send failed for all variants:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 502 }
      )
    }

    // Auto-correct contact format if alternative format succeeded
    if (workingPhone !== sanitizedPhone) {
      console.log(
        `[whatsapp/send] Auto-corrected contact phone: ${sanitizedPhone} → ${workingPhone}`
      )
      await supabase
        .from('contacts')
        .update({ phone: workingPhone })
        .eq('id', contact.id)
    }

    // সুপাবেস ডাটাবেসে মেসেজ স্টোর করা (ছবি/ভিডিও/অডিও অনুযায়ী content_type সহ)
    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        content_type: message_type,
        content_text: content_text || null,
        media_url: media_url || null,
        template_name: template_name || null,
        message_id: waMessageId,
        status: 'sent',
        reply_to_message_id: reply_to_message_id || null,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error inserting sent message:', msgError)
      return NextResponse.json(
        { error: `Message sent to Meta but failed to save to DB: ${msgError.message}` },
        { status: 500 }
      )
    }

    // Update conversation list preview
    await supabase
      .from('conversations')
      .update({
        last_message_text: content_text || `[${message_type}]`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    return NextResponse.json({
      success: true,
      message_id: messageRecord.id,
      whatsapp_message_id: waMessageId,
    })
  } catch (error) {
    console.error('Error in WhatsApp send POST:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}