import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const secretHeader = request.headers.get('x-webhook-secret')
    if (secretHeader !== process.env.WEBHOOK_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { record, type, table } = body

    if (type !== 'INSERT' || table !== 'messages' || record.sender_type !== 'customer') {
      return NextResponse.json({ success: true, message: 'Ignored non-customer insert' })
    }

    const conversationId = record.conversation_id
    const customerMessageText = record.content_text

    if (!conversationId || !customerMessageText) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversationId)
      .maybeSingle()

    if (convError || !conversation || !conversation.ai_active) {
      return NextResponse.json({ success: true, message: 'AI is disabled for this conversation.' })
    }

    const contact = conversation.contact
    if (!contact?.phone) {
      return NextResponse.json({ error: 'Contact phone not found' }, { status: 400 })
    }

    const { data: config, error: configError } = await supabaseAdmin
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', conversation.user_id)
      .maybeSingle()

    if (configError || !config || !config.openai_api_key) {
      return NextResponse.json({ error: 'AI is not configured by the workspace owner.' }, { status: 400 })
    }

    const decryptedApiKey = decrypt(config.openai_api_key)
    const aiPrompt = config.ai_prompt || 'You are a helpful customer service assistant.'
    const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
    const aiModel = config.ai_model || 'gpt-4o-mini'

    const { data: history, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('sender_type, content_text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Failed to fetch conversation history:', historyError)
    }

    const chatMemory = (history || [])
      .reverse()
      .map((m) => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.content_text || '',
      }))

    const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
    const apiUrl = `${sanitizedBaseUrl}/chat/completions`

    const customHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedApiKey}`
    }

    if (aiBaseUrl.includes('openrouter')) {
      customHeaders['HTTP-Referer'] = 'https://amarchat.vercel.app'
      customHeaders['X-Title'] = 'amarchat CRM'
    }

    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: customHeaders,
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: aiPrompt },
          ...chatMemory,
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    })

    const aiData = await aiRes.json()
    if (!aiRes.ok) {
      throw new Error(aiData?.error?.message || `AI Provider failed with HTTP ${aiRes.status}`)
    }

    const aiReplyText = aiData.choices?.[0]?.message?.content?.trim()
    if (!aiReplyText) {
      return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 })
    }

    const decryptedMetaToken = decrypt(config.access_token)
    const sanitizedPhone = sanitizePhoneForMeta(contact.phone)
    const metaUrl = `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: sanitizedPhone,
      type: 'text',
      text: { body: aiReplyText },
      context: { message_id: record.message_id }
    }

    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedMetaToken}`,
      },
      body: JSON.stringify(metaPayload),
    })

    const metaResData = await metaResponse.json()
    if (!metaResponse.ok) {
      throw new Error(metaResData?.error?.message || `Meta send failed with HTTP ${metaResponse.status}`)
    }

    const waMessageId = metaResData.messages?.[0]?.id || ''

    const { error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        content_type: 'text',
        content_text: aiReplyText,
        message_id: waMessageId,
        status: 'sent',
      })

    if (insertError) {
      console.error('Failed to insert AI reply into DB:', insertError.message)
    }

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_text: aiReplyText,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return NextResponse.json({ success: true, ai_reply: aiReplyText, wa_message_id: waMessageId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in AI Responder POST:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}