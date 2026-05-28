import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { getMediaUrl } from '@/lib/whatsapp/meta-api'
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { runAutomationsForTrigger } from '@/lib/automations/engine'

// MatchedConfig টাইপ-সেফ ইন্টারফেস
interface MatchedConfigRow {
  id: string
  verify_token?: string
}

// ContactRow টাইপ-সেফ ইন্টারফেস
interface ContactRow {
  id: string
  user_id: string
  workspace_id?: string | null
  phone: string
  name: string
  avatar_url?: string | null
}

// ContactOutcome টাইপ-সেফ ইন্টারফেস
interface ContactOutcome {
  contact: ContactRow
  wasCreated: boolean
}

// GPT-4o মাল্টিমোডাল ইনপুট টাইপ ইন্টারফেস
interface MessageContentText {
  type: 'text'
  text: string
}

interface MessageContentImage {
  type: 'image_url'
  image_url: { url: string }
}

type MessageContent = MessageContentText | MessageContentImage

// Lazy-initialized to avoid build-time crash when env vars are missing
let _adminClient: SupabaseClient | null = null
function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  context?: { id: string }
}

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: WhatsAppMessage[]
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const { data: configs, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, verify_token')

    if (configError || !configs) {
      console.error('Error fetching configs for verification:', configError)
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 403 }
      )
    }

    let matchedConfig: MatchedConfigRow | null = null
    for (const config of configs) {
      if (!config.verify_token) continue
      try {
        if (decrypt(config.verify_token) === verifyToken) {
          matchedConfig = config as MatchedConfigRow
          break
        }
      } catch {
        // skip
      }
    }

    if (matchedConfig && matchedConfig.verify_token) {
      if (isLegacyFormat(matchedConfig.verify_token)) {
        void supabaseAdmin()
          .from('whatsapp_config')
          .update({ verify_token: encrypt(verifyToken) })
          .eq('id', matchedConfig.id)
          .then(({ error }: { error: unknown }) => {
            if (error) {
              console.warn(
                '[webhook] verify_token GCM upgrade failed:',
                (error as { message?: string })?.message ?? error,
              )
            }
          })
      }
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json(
      { error: 'Verification token mismatch' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Receive messages
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] rejected request with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await processWebhook(body)
  } catch (error) {
    console.error('Error processing webhook:', error)
  }

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

async function processWebhook(body: { entry?: WhatsAppWebhookEntry[] }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value

      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status)
        }
      }

      if (!value.messages || !value.contacts) continue

      const phoneNumberId = value.metadata.phone_number_id

      const { data: config, error: configError } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('*')
        .eq('phone_number_id', phoneNumberId)
        .single()

      if (configError || !config) {
        console.error('No config found for phone_number_id:', phoneNumberId)
        continue
      }

      const decryptedAccessToken = decrypt(config.access_token || '')

      for (let i = 0; i < value.messages.length; i++) {
        const message = value.messages[i]
        const contact = value.contacts[i] || value.contacts[0]

        await processMessage(
          message,
          contact,
          config.user_id,
          decryptedAccessToken,
          phoneNumberId
        )
      }
    }
  }
}

const RECIPIENT_STATUS_LADDER = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
] as const

function ladderLevel(s: string): number {
  const idx = (RECIPIENT_STATUS_LADDER as readonly string[]).indexOf(s)
  return idx < 0 ? -1 : idx
}

function isValidStatusTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') {
    return current === 'pending' || current === 'sent'
  }
  if (current === 'failed') {
    return false
  }
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false
  if (ci < 0) return true
  return ii > ci
}

async function handleStatusUpdate(status: {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}) {
  const { error: msgErr } = await supabaseAdmin()
    .from('messages')
    .update({ status: status.status })
    .eq('message_id', status.id)

  if (msgErr) {
    console.error('Error updating message status:', msgErr)
  }

  const tsIso = new Date(parseInt(status.timestamp) * 1000).toISOString()

  const { data: recipient, error: recFetchErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .select('id, status')
    .eq('whatsapp_message_id', status.id)
    .maybeSingle()

  if (recFetchErr) {
    console.error('Error fetching broadcast recipient:', recFetchErr)
    return
  }
  if (!recipient) return

  if (!isValidStatusTransition(recipient.status, status.status)) return

  const update: Record<string, unknown> = { status: status.status }
  if (status.status === 'sent' && !('sent_at' in update)) update.sent_at = tsIso
  if (status.status === 'delivered') update.delivered_at = tsIso
  if (status.status === 'read') update.read_at = tsIso

  const { error: recUpdateErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .update(update)
    .eq('id', recipient.id)

  if (recUpdateErr) {
    console.error('Error updating broadcast recipient status:', recUpdateErr)
  }
}

async function flagBroadcastReplyIfAny(userId: string, contactId: string) {
  try {
    const { data: recs, error } = await supabaseAdmin()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(user_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.user_id', userId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !recs || recs.length === 0) return

    const row = recs[0]
    const { error: updErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('id', row.id)

    if (updErr) {
      console.error('Error marking broadcast recipient replied:', updErr)
    }
  } catch (err) {
    console.error('flagBroadcastReplyIfAny failed:', err)
  }
}

async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', metaId)
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (error) {
    console.error('[webhook] lookupInternalIdByMetaId failed:', error.message)
    return null
  }
  return data?.id ?? null
}

async function handleReaction(
  message: WhatsAppMessage,
  conversationId: string,
  contactId: string
) {
  const reaction = message.reaction
  if (!reaction?.message_id) return

  const targetInternalId = await lookupInternalIdByMetaId(
    reaction.message_id,
    conversationId
  )
  if (!targetInternalId) {
    console.warn(
      '[webhook] reaction target message not found; skipping',
      reaction.message_id
    )
    return
  }

  if (!reaction.emoji) {
    const { error: delError } = await supabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', targetInternalId)
      .eq('actor_type', 'customer')
      .eq('actor_id', contactId)
    if (delError) {
      console.error('[webhook] reaction delete failed:', delError.message)
    }
    return
  }

  const { error: upsertError } = await supabaseAdmin()
    .from('message_reactions')
    .upsert(
      {
        message_id: targetInternalId,
        conversation_id: conversationId,
        actor_type: 'customer',
        actor_id: contactId,
        emoji: reaction.emoji,
      },
      { onConflict: 'message_id,actor_type,actor_id' }
    )
  if (upsertError) {
    console.error('[webhook] reaction upsert failed:', upsertError.message)
  }
}

async function sendWhatsAppMessage(
  phone: string,
  text: string,
  phoneNumberId: string,
  accessToken: string
) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      }
    )
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error('[webhook] Meta API send message failed:', errBody)
    }
  } catch (err) {
    console.error('[webhook] sendWhatsAppMessage exception:', err)
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  userId: string,
  accessToken: string,
  phoneNumberId: string
) {
  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  const contactOutcome = await findOrCreateContact(
    userId,
    senderPhone,
    contactName
  )
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  const conversation = await findOrCreateConversation(
    userId,
    contactRecord.id
  )
  if (!conversation) return

  if (message.type === 'reaction') {
    await handleReaction(message, conversation.id, contactRecord.id)
    return
  }

  // ফিক্স ১: এআই এপিআই কি ও ওনার কনফিগ কুয়েরি লজিক শুরুতেই রিট্রাইভ করা হলো
  // এটি ভয়েস নোট (Whisper) এবং চ্যাট কমপ্লিশন (GPT-4o) উভয় ব্লকে ব্যবহৃত হবে
  const { data: config, error: configError } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('workspace_id', conversation.workspace_id)
    .maybeSingle()

  const decryptedApiKey = config && config.openai_api_key ? decrypt(config.openai_api_key) : null

  let contentText: string | null = null
  let mediaUrl: string | null = null
  let mediaType: string | null = null
  let imageBase64: string | null = null // GPT-4o ভিশনের জন্য বেস৬৪ ইমেজ ট্র্যাকার

  if (message.type === 'audio' && message.audio?.id && decryptedApiKey) {
    try {
      const verifiedUrlData = (await getMediaUrl({
        mediaId: message.audio.id,
        accessToken,
      })) as { url: string; mimeType: string } | null

      if (verifiedUrlData && verifiedUrlData.url) {
        const audioRes = await fetch(verifiedUrlData.url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        
        if (!audioRes.ok) {
          throw new Error(`Media download failed with status: ${audioRes.status}`)
        }

        const arrayBuffer = await audioRes.arrayBuffer()
        const audioBuffer = Buffer.from(arrayBuffer)
        
        const formData = new FormData()
        const blob = new Blob([audioBuffer], { type: 'audio/ogg' })
        formData.append('file', blob, 'voice.ogg')
        formData.append('model', 'whisper-1')
        formData.append('language', 'bn')

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            // ওনারের নিজস্ব ডিক্রিপ্ট করা কি দিয়ে এপিআই কল হচ্ছে (কোনো প্ল্যাটফর্ম কি না)
            'Authorization': `Bearer ${decryptedApiKey}`,
          },
          body: formData,
        })

        if (whisperRes.ok) {
          const transData = await whisperRes.json()
          contentText = transData.text || '[ভয়েস নোটটি খালি ছিল]'
          mediaUrl = `/api/whatsapp/media/${message.audio.id}`
        }
      }
    } catch (err) {
      console.error('[webhook] Whisper transcription failed:', err)
      contentText = '[ভয়েস নোটটি ট্রান্সক্রাইব করা যায়নি]'
    }
  } else if (message.type === 'image' && message.image?.id) {
    // ফিক্স ২: মেটা ইমেজ ডাউনলোড লজিক এবং সরাসরি Base64 কনভার্সন
    // ইমেজটি ডাউনলোড করে Base64 ডেটাতে কনভার্ট করা হচ্ছে যেন আমেরিকার জিপিটি সার্ভার সরাসরি ছবিটি দেখতে পারে
    try {
      const verifiedUrlData = (await getMediaUrl({
        mediaId: message.image.id,
        accessToken,
      })) as { url: string; mimeType: string } | null

      if (verifiedUrlData && verifiedUrlData.url) {
        const imgRes = await fetch(verifiedUrlData.url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          imageBase64 = `data:${verifiedUrlData.mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`
          mediaUrl = `/api/whatsapp/media/${message.image.id}` // UI তে দেখানোর জন্য লোকাল লিঙ্ক
          contentText = message.image.caption || null
        }
      }
    } catch (err) {
      console.error('[webhook] Image download for vision failed:', err)
    }
  } else {
    const parsed = await parseMessageContent(message, accessToken)
    contentText = parsed.contentText
    mediaUrl = parsed.mediaUrl
    mediaType = parsed.mediaType
  }

  void mediaType

  const ALLOWED_CONTENT_TYPES = new Set([
    'text', 'image', 'document', 'audio', 'video', 'location', 'template',
  ])
  const contentType = ALLOWED_CONTENT_TYPES.has(message.type)
    ? message.type
    : message.type === 'sticker'
      ? 'image'
      : 'text'

  const { count: priorCustomerMsgCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
  const isFirstInboundMessage = (priorCustomerMsgCount ?? 0) === 0

  const { error: msgError } = await supabaseAdmin().from('messages').insert({
    conversation_id: conversation.id,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    message_id: message.id,
    status: 'delivered',
    created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
  })

  if (msgError) {
    console.error('Error inserting message:', msgError)
    return
  }

  // কাস্টমার যদি ক্যাপশন ছাড়া শুধু ছবিও পাঠায়, তাও এআই অটো-রেসপন্স ট্রিগার হবে
  if (conversation.ai_active && (contentText || message.type === 'image') && decryptedApiKey && config) {
    try {
      const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
      const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
      const embeddingsUrl = `${sanitizedBaseUrl}/embeddings`

      const embeddingModel = aiBaseUrl.includes('openrouter') 
        ? 'openai/text-embedding-3-small' 
        : 'text-embedding-3-small'

      let matchedContext = ''
      
      if (contentText) {
        const embedRes = await fetch(embeddingsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${decryptedApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: contentText,
            model: embeddingModel,
          }),
        })

        if (embedRes.ok) {
          const embedData = await embedRes.json()
          const queryVector = embedData.data[0].embedding

          const { data: ragDocs, error: ragError } = await supabaseAdmin()
            .rpc('match_knowledge_base', {
              query_embedding: queryVector,
              match_threshold: 0.3,
              match_count: 3,
              p_workspace_id: conversation.workspace_id,
            })

          if (!ragError && ragDocs) {
            matchedContext = (ragDocs as Array<{ content: string }>).map((doc) => doc.content).join('\n')
          }
        }
      }

      // জিপিটি-৪ও ভিশন মাল্টিমোডাল ইনপুট তৈরিকরণ
      const userMessageContent: MessageContent[] = []
      if (contentText) {
        userMessageContent.push({ type: 'text', text: contentText })
      } else if (message.type === 'image') {
        userMessageContent.push({ type: 'text', text: 'কাস্টমার একটি ছবি পাঠিয়েছেন। ছবিটিতে কী আছে তা দেখুন এবং বাংলায় সাহায্য করুন।' })
      }

      // কাস্টমার ছবি পাঠালে এবং সফলভাবে Base64 জেনারেট হলে সেটি রিকোয়েস্টে পাঠানো হচ্ছে
      if (message.type === 'image' && imageBase64) {
        userMessageContent.push({
          type: 'image_url',
          image_url: { url: imageBase64 }, // direct base64 data url
        })
      }

      const chatUrl = `${sanitizedBaseUrl}/chat/completions`
      const aiModel = config.ai_model || 'gpt-4o-mini'

      const customHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedApiKey}`
      }

      if (aiBaseUrl.includes('openrouter')) {
        customHeaders['HTTP-Referer'] = 'https://www.amarchat.xyz'
        customHeaders['X-Title'] = 'amarchat CRM'
      }

      const gptRes = await fetch(chatUrl, {
        method: 'POST',
        headers: customHeaders,
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: 'system',
              content: `You are "Lamia", an expert, highly polite, and extremely persuasive sales executive for this business. 
              Always speak in a friendly Bangla/Banglish blend, using respectful terms like "সম্মানিত ক্রেতা".
              Provide discount packages or combo offers if the customer negotiates or thinks the price is high.
              Use this business knowledge base to answer perfectly and close the sale:
              ---------------------
              ${matchedContext || 'No specific knowledge base matched. Rely on general warm customer support.'}
              ---------------------`
            },
            {
              role: 'user',
              content: userMessageContent
            }
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      })

      if (gptRes.ok) {
        const gptData = await gptRes.json()
        const aiReplyText = gptData.choices[0].message.content || '[নিরাপত্তাজনিত কারণে মেসেজ তৈরি করা যায়নি]'

        await sendWhatsAppMessage(senderPhone, aiReplyText, phoneNumberId, accessToken)

        await supabaseAdmin().from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'bot',
          content_type: 'text',
          content_text: aiReplyText,
          status: 'sent',
          created_at: new Date().toISOString(),
        })
      } else {
        const errBody = await gptRes.json().catch(() => ({}))
        console.error('[webhook] AI completions API failed:', errBody)
      }
    } catch (err) {
      console.error('[webhook] GPT/AI execution or send failed:', err)
    }
  }

  const { error: convError } = await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${message.type}]`,
      last_message_at: new Date().toISOString(),
      unread_count: conversation.unread_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  if (convError) {
    console.error('Error updating conversation:', convError)
  }

  // ফিক্স ৩: ৭১৬ লাইনের contactId বাগ সমাধান
  await flagBroadcastReplyIfAny(userId, contactRecord.id)

  const inboundText = contentText ?? message.text?.body ?? ''
  const automationTriggers: (
    | 'new_contact_created'
    | 'first_inbound_message'
    | 'new_message_received'
    | 'keyword_match'
  )[] = ['new_message_received', 'keyword_match']

  if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
  if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')
  for (const triggerType of automationTriggers) {
    runAutomationsForTrigger({
      userId,
      triggerType,
      contactId: contactRecord.id,
      context: {
        message_text: inboundText,
        conversation_id: conversation.id,
      },
    }).catch((err) => console.error('[automations] dispatch failed:', err))
  }
}

async function parseMessageContent(
  message: WhatsAppMessage,
  accessToken: string
): Promise<{
  contentText: string | null
  mediaUrl: string | null
  mediaType: string | null
}> {
  const verifyAndBuildUrl = async (
    mediaId: string
  ): Promise<string | null> => {
    try {
      await getMediaUrl({ mediaId, accessToken })
      return `/api/whatsapp/media/${mediaId}`
    } catch (error) {
      console.error(
        `Failed to verify media ${mediaId} with Meta:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  switch (message.type) {
    case 'text':
      return {
        contentText: message.text?.body || null,
        mediaUrl: null,
        mediaType: null,
      }

    case 'image':
      if (message.image?.id) {
        return {
          contentText: message.image.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.image.id),
          mediaType: message.image.mime_type,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'video':
      if (message.video?.id) {
        return {
          contentText: message.video.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.video.id),
          mediaType: message.video.mime_type,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'document':
      if (message.document?.id) {
        return {
          contentText:
            message.document.caption || message.document.filename || null,
          mediaUrl: await verifyAndBuildUrl(message.document.id),
          mediaType: message.document.mime_type,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'audio':
      if (message.audio?.id) {
        return {
          contentText: null,
          mediaUrl: await verifyAndBuildUrl(message.audio.id),
          mediaType: message.audio.mime_type,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'sticker':
      if (message.sticker?.id) {
        return {
          contentText: null,
          mediaUrl: await verifyAndBuildUrl(message.sticker.id),
          mediaType: message.sticker.mime_type,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return {
          contentText: locationText,
          mediaUrl: null,
          mediaType: null,
        }
      }
      return { contentText: null, mediaUrl: null, mediaType: null }

    case 'reaction':
      return {
        contentText: message.reaction?.emoji || null,
        mediaUrl: null,
        mediaType: null,
      }

    default:
      return {
        contentText: `[Unsupported message type: ${message.type}]`,
        mediaUrl: null,
        mediaType: null,
      }
  }
}

async function findOrCreateContact(
  userId: string,
  phone: string,
  name: string
): Promise<ContactOutcome | null> {
  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile?.workspace_id) return null

  const { data: contacts, error: contactsError } = await supabaseAdmin()
    .from('contacts')
    .select('*')
    .eq('workspace_id', profile.workspace_id)

  if (contactsError) {
    console.error('Error fetching contacts:', contactsError)
    return null
  }

  const existingContact = contacts?.find((c: ContactRow) => phonesMatch(c.phone, phone))

  if (existingContact) {
    if (name && name !== existingContact.name) {
      await supabaseAdmin()
        .from('contacts')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existingContact.id)
    }
    return { contact: existingContact, wasCreated: false }
  }

  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      user_id: userId,
      workspace_id: profile.workspace_id,
      phone,
      name: name || phone,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

async function findOrCreateConversation(userId: string, contactId: string) {
  const { data: existing, error: findError } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!findError && existing) {
    return existing
  }

  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      user_id: userId,
      contact_id: contactId,
      workspace_id: profile?.workspace_id || null,
    })
    .select()
    .maybeSingle()

  if (createError) {
    console.warn('[webhook] conversation creation failed or concurrently existed, running fallback fetch:', createError.message)
    const { data: fallbackConv } = await supabaseAdmin()
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fallbackConv) {
      return fallbackConv
    }
    return null
  }

  return newConv
}