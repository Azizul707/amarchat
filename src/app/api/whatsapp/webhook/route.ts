import { NextResponse, after } from 'next/server'
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

interface MessageContentText {
  type: 'text'
  text: string
}

interface MessageContentImage {
  type: 'image_url'
  image_url: { url: string }
}

type MessageContent = MessageContentText | MessageContentImage

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

// গ্লোবাল সেফ ডাউনলোডার (User-Agent spoofing ও ৩xx রিডাইরেক্ট রি-ফরোয়ার্ডিং বাগ মুক্ত)
async function safeDownload(url: string, token: string): Promise<ArrayBuffer | null> {
  try {
    console.log('[safeDownload] Initiating download request with curl/7.64.1 User-Agent');
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'curl/7.64.1' // ফেসবুকের সিকিউরিটি বাইপাস করতে ইউজার এজেন্ট মাস্ট
      },
      redirect: 'manual',
    })
    
    if (res.status >= 300 && res.status < 400) {
      const redirectUrl = res.headers.get('location')
      if (redirectUrl) {
        console.log('[safeDownload] Redirecting and stripping Authorization header to CDN.');
        const cdnRes = await fetch(redirectUrl, { 
          method: 'GET',
          headers: {
            'User-Agent': 'curl/7.64.1'
          }
        })
        if (cdnRes.ok) return await cdnRes.arrayBuffer()
      }
    } else if (res.ok) {
      return await res.arrayBuffer()
    }
  } catch (e) {
    console.error('[safeDownload] Safe download exception:', e)
  }
  return null
}

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
      console.error('[webhook-verify] Error fetching configs:', configError)
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
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
              console.warn('[webhook-verify] upgrade failed:', error)
            }
          })
      }
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 })
  } catch (error) {
    console.error('[webhook-verify] Unexpected GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] Rejected request: Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // মেটা-কে instantly HTTP 200 দিয়ে দেওয়া হচ্ছে যাতে ডুপ্লিকেট retry জেনারেট না হয়।
  after(async () => {
    try {
      console.log('[webhook-after] Background thread starting.');
      await processWebhook(body)
      console.log('[webhook-after] Background thread finished gracefully.');
    } catch (err) {
      console.error('[webhook-after] Background thread crash:', err)
    }
  })

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
        console.error('[webhook] Config lookup failed for phone number:', phoneNumberId, configError)
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
    console.error('[webhook] Status write error:', msgErr)
  }

  const tsIso = new Date(parseInt(status.timestamp) * 1000).toISOString()

  const { data: recipient, error: recFetchErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .select('id, status')
    .eq('whatsapp_message_id', status.id)
    .maybeSingle()

  if (recFetchErr) {
    console.error('[webhook] Broadcast fetch error:', recFetchErr)
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
    console.error('[webhook] Broadcast recipient status error:', recUpdateErr)
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
      console.error('[webhook] Broadcast reply flag error:', updErr)
    }
  } catch (err) {
    console.error('[webhook] flagBroadcastReplyIfAny fail:', err)
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
    console.error('[webhook] Reaction target lookup error:', error.message)
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
    console.warn('[webhook] Target message missing for reaction:', reaction.message_id)
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
      console.error('[webhook] Reaction delete error:', delError.message)
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
    console.error('[webhook] Reaction upsert error:', upsertError.message)
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
      console.error('[webhook-send] Meta API message send failed:', errBody)
    } else {
      console.log('[webhook-send] WhatsApp response sent successfully to customer.')
    }
  } catch (err) {
    console.error('[webhook-send] Exception during WhatsApp send:', err)
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  userId: string,
  accessToken: string,
  phoneNumberId: string
) {
  console.log(`[webhook] Received message event. ID: ${message.id}, Type: ${message.type}`);

  const { data: existingMsg } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', message.id)
    .maybeSingle()

  if (existingMsg) {
    console.warn('[webhook] Duplicate request detected; skipping processing.', message.id)
    return
  }

  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  const contactOutcome = await findOrCreateContact(userId, senderPhone, contactName)
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  const conversation = await findOrCreateConversation(userId, contactRecord.id)
  if (!conversation) return

  if (message.type === 'reaction') {
    await handleReaction(message, conversation.id, contactRecord.id)
    return
  }

  const ALLOWED_CONTENT_TYPES = new Set([
    'text', 'image', 'document', 'audio', 'video', 'location', 'template',
  ])
  const contentType = ALLOWED_CONTENT_TYPES.has(message.type)
    ? message.type
    : message.type === 'sticker'
      ? 'image'
      : 'text'

  const initialContentText = message.type === 'text' ? (message.text?.body || null) : '[ভয়েস মেসেজ...]'

  console.log(`[webhook-lock] Inserting atomic row lock for message_id: ${message.id}`);
  const { data: earlyMsg, error: insertError } = await supabaseAdmin()
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_type: 'customer',
      content_type: contentType,
      content_text: initialContentText,
      media_url: null,
      message_id: message.id,
      status: 'delivered',
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })
    .select()
    .maybeSingle()

  if (insertError || !earlyMsg) {
    console.warn('[webhook-lock] Lock rejected (duplicate row collision prevented):', message.id, insertError?.message)
    return
  }

  const { data: config } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('workspace_id', conversation.workspace_id)
    .maybeSingle()

  const decryptedApiKey = config && config.openai_api_key ? decrypt(config.openai_api_key) : null

  let contentText: string | null = null
  let mediaUrl: string | null = null
  let imageBase64: string | null = null
  let isTranscriptionFailed = false 

  if (message.type === 'audio' && message.audio?.id && decryptedApiKey && config) {
    mediaUrl = `/api/whatsapp/media/${message.audio.id}`
    console.log('[webhook-audio] Detected voice note. Fetching meta CDN URL for ID:', message.audio.id);
    
    try {
      const verifiedUrlData = (await getMediaUrl({
        mediaId: message.audio.id,
        accessToken,
      })) as { url: string; mimeType: string } | null

      if (verifiedUrlData && verifiedUrlData.url) {
        let downloadResult: ArrayBuffer | null = null
        let attempts = 0
        const maxAttempts = 5 // মেটা প্রোপাগেশন ডিলে আটকাতে ৫ বার চেষ্টা করা হচ্ছে
        const delayMs = 2500 // প্রতিবার আড়াই সেকেন্ড ডিলে (মোট ১২.৫ সেকেন্ড ব্যাকগ্রাউন্ড বাফার উইন্ডো)

        while (attempts < maxAttempts) {
          if (attempts > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }
          
          const tempResult = await safeDownload(verifiedUrlData.url, accessToken)

          if (tempResult) {
            if (tempResult.byteLength > 500) {
              downloadResult = tempResult
              break
            }
          }
          attempts++
        }

        if (downloadResult) {
          const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
          const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
          const transcriptionUrl = `${sanitizedBaseUrl}/audio/transcriptions`
          
          let whisperModel = 'openai/whisper-large-v3' // ওপেনরাউটার এর সাথে বেস্ট সামঞ্জস্যের জন্য স্ট্যান্ডার্ড ফলব্যাক
          if (aiBaseUrl.includes('groq')) {
            whisperModel = 'whisper-large-v3'
          } else if (aiBaseUrl.includes('api.openai.com')) {
            whisperModel = 'whisper-1'
          }

          let whisperRes: Response;
          const isOpenRouter = aiBaseUrl.includes('openrouter');

          if (isOpenRouter) {
            // ১. মার্চেন্ট OpenRouter ব্যবহার করলে: ওজিজি অডিও বাফারকে Base64 অবজেক্টে কনভার্ট করে JSON পে-লোডে পাঠানো হচ্ছে।
            const base64Audio = Buffer.from(downloadResult).toString('base64');
            const openRouterModel = config.ai_model && config.ai_model.includes('whisper')
              ? config.ai_model
              : 'openai/whisper-large-v3';

            // ডাইনামিকলি অডিও ফরম্যাট চিহ্নিতকরণ (মেটা ভয়েস নোটের জন্য ওজিজি ও রিজিড ডিকোডিং সেভগার্ড)
            let audioFormat = 'ogg';
            if (verifiedUrlData.mimeType) {
              if (verifiedUrlData.mimeType.includes('ogg')) {
                audioFormat = 'ogg';
              } else if (verifiedUrlData.mimeType.includes('mp4') || verifiedUrlData.mimeType.includes('m4a')) {
                audioFormat = 'm4a';
              } else if (verifiedUrlData.mimeType.includes('mpeg') || verifiedUrlData.mimeType.includes('mp3')) {
                audioFormat = 'mp3';
              } else if (verifiedUrlData.mimeType.includes('wav')) {
                audioFormat = 'wav';
              }
            }

            console.log(`[webhook-whisper] Sending Base64 JSON payload to OpenRouter STT. Format: ${audioFormat}, Model: ${openRouterModel}`);
            whisperRes = await fetch(transcriptionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${decryptedApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: openRouterModel,
                input_audio: {
                  data: base64Audio,
                  format: audioFormat
                },
                language: 'bn'
              })
            });
          } else {
            // ২. স্ট্যান্ডার্ড OpenAI বা Groq এপিআই-এর জন্য প্রথাগত মাল্টিপার্ট বাফার কনস্ট্রাক্ট করা হচ্ছে।
            const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`
            const chunks: Buffer[] = []

            chunks.push(Buffer.from(`--${boundary}\r\n`))
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`))
            chunks.push(Buffer.from(`${whisperModel}\r\n`))

            chunks.push(Buffer.from(`--${boundary}\r\n`))
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n`))
            chunks.push(Buffer.from(`bn\r\n`))

            chunks.push(Buffer.from(`--${boundary}\r\n`))
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="voice.mp3"\r\n`))
            chunks.push(Buffer.from(`Content-Type: audio/mpeg\r\n\r\n`))
            chunks.push(Buffer.from(downloadResult))
            chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`))

            const multipartBody = Buffer.concat(chunks)

            console.log(`[webhook-whisper] Sending Multipart form boundary to Standard API: ${transcriptionUrl}`);
            whisperRes = await fetch(transcriptionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${decryptedApiKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
              },
              body: multipartBody,
            })
          }

          if (whisperRes.ok) {
            const transData = await whisperRes.json()
            contentText = transData.text || '[ভয়েস নোটটি খালি ছিল]'
            console.log('[webhook-whisper] Transcribed successfully:', contentText);
          } else {
            const errBody = await whisperRes.json().catch(() => ({}))
            console.error('[webhook-whisper] Failed with status:', whisperRes.status, JSON.stringify(errBody))
            contentText = '[ভয়েস নোটটি ট্রান্সক্রাইব করা যায়নি]'
            isTranscriptionFailed = true 
          }
        } else {
          console.error('[webhook-audio] Voice file download failed.')
          contentText = '[ভয়েস নোটটি ডাউনলোড করা যায়নি]'
          isTranscriptionFailed = true
        }
      }
    } catch (err) {
      console.error('[webhook-audio] Voice transcription flow exception:', err)
      contentText = '[ভয়েস নোটটি ট্রান্সক্রাইব করা যায়নি]'
      isTranscriptionFailed = true
    }
  } else if (message.type === 'image' && message.image?.id) {
    mediaUrl = `/api/whatsapp/media/${message.image.id}`
    
    try {
      const verifiedUrlData = (await getMediaUrl({
        mediaId: message.image.id,
        accessToken,
      })) as { url: string; mimeType: string } | null

      if (verifiedUrlData && verifiedUrlData.url) {
        // ইমেজ ডাউনলোডেও সেফ ডাউনলোডার এবং ইউজার এজেন্ট প্রোটেকশন ব্যবহার করা হলো
        const tempResult = await safeDownload(verifiedUrlData.url, accessToken)
        if (tempResult) {
          const buffer = Buffer.from(tempResult)
          imageBase64 = `data:${verifiedUrlData.mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`
          contentText = message.image.caption || null
        }
      }
    } catch (err) {
      console.error('[webhook-image] Vision download failed:', err)
    }
  } else {
    const parsed = await parseMessageContent(message, accessToken)
    contentText = parsed.contentText
    mediaUrl = parsed.mediaUrl
  }

  console.log('[webhook-database] Updating locked message row with parsed results...');
  const { error: updateError } = await supabaseAdmin()
    .from('messages')
    .update({
      content_text: contentText,
      media_url: mediaUrl,
    })
    .eq('id', earlyMsg.id)

  if (updateError) {
    console.error('[webhook-database] Failed to update message row:', updateError.message)
  }

  const { count: priorCustomerMsgCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
  const isFirstInboundMessage = (priorCustomerMsgCount ?? 0) <= 1

  const isFallbackText = contentText === '[ভয়েস নোটটি খালি ছিল]' || 
                         contentText === '[ভয়েস নোটটি ট্রান্সক্রাইব করা যায়নি]' || 
                         contentText === '[ভয়েস নোটটি ডাউনলোড করা যায়নি]';

  const shouldTriggerAI = conversation.ai_active && 
    (contentText || message.type === 'image') && 
    decryptedApiKey && 
    config;

  if (shouldTriggerAI) {
    try {
      const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1'
      const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
      const embeddingsUrl = `${sanitizedBaseUrl}/embeddings`

      const embeddingModel = aiBaseUrl.includes('openrouter') 
        ? 'openai/text-embedding-3-small' 
        : 'text-embedding-3-small'

      let matchedContext = ''
      
      if (contentText && !isFallbackText && !isTranscriptionFailed) {
        console.log('[webhook-ai] Fetching Knowledge Base directly by workspace_id to avoid RAG dilution:', conversation.workspace_id);
        
        // **১-টু-১ এন্টারপ্রাইজ ফিক্স (Direct exact select lookup)**: 
        // যেহেতু amarchat-এ প্রতি মার্চেন্টের জন্য একটি ইউনিক নলেজ বেস রো থাকে, তাইCosine Similarity এর গাণিতিক হ্রাস (dilution)
        // এড়াতে আমরা সরাসরি ১ মিলি সেকেন্ডে ডাটাবেজ থেকে কন্টেন্ট লোড করছি। এটি এআই-এর কাছে রিয়েল-টাইম তথ্য পৌঁছানো নিশ্চিত করে।
        const { data: kbRow, error: kbError } = await supabaseAdmin()
          .from('knowledge_base')
          .select('content')
          .eq('workspace_id', conversation.workspace_id)
          .maybeSingle()

        if (!kbError && kbRow?.content) {
          matchedContext = kbRow.content
          console.log('[webhook-ai] Direct exact knowledge base retrieval succeeded. Size:', matchedContext.length);
        } else {
          console.warn('[webhook-ai] Direct lookup failed or empty. Falling back to semantic vector search...', kbError);
          
          // সেফ ফলব্যাক: সরাসরি ডাটা না পেলে ভেক্টর আরপিসি ম্যাচিং চেষ্টা করা হচ্ছে
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
      }

      const userMessageContent: MessageContent[] = []
      
      if (isFallbackText || isTranscriptionFailed) {
        userMessageContent.push({
          type: 'text',
          text: 'কাস্টমার একটি ভয়েস মেসেজ পাঠিয়েছেন কিন্তু কারিগরি ত্রুটির কারণে ভয়েসটি শোনা যায়নি। কাস্টমারকে অত্যন্ত বিনয়ের সাথে বাংলায় বলুন যে ভয়েসটি স্পষ্ট শোনা যায়নি এবং কষ্ট করে টেক্সট লিখে জানাতে বলুন।'
        })
      } else if (message.type === 'image') {
        userMessageContent.push({ 
          type: 'text', 
          text: 'কাস্টমার একটি ছবি পাঠিয়েছেন। ছবিটি বিশ্লেষণ করুন। কঠোর নিয়ম: যদি ছবিটি এই ব্যবসার নলেজবেজ বা ডোমেইনের সাথে সরাসরি সম্পর্কিত হয় (যেমন: আপনার নিজস্ব পণ্য, পেমেন্ট স্ক্রিনশট, অর্ডার রিসিট, বা ত্রুটিপূর্ণ পণ্য), তবে নলেজবেজ অনুসরণ করে বাংলায় গ্রাহককে সহায়তা করুন। আর যদি ছবিটি ব্যবসার বাইরের সম্পূর্ণ অপ্রাসঙ্গিক কোনো বিষয় হয় (যেমন: মিম, সেলফি, বিনোদনমূলক বা অন্য কোনো অবান্তর ছবি), তবে কোনোভাবেই ওই অবান্তর ছবি নিয়ে আলোচনায় মাতবেন না। অত্যন্ত ভদ্রভাবে বাংলায় দুঃখ প্রকাশ করে বলুন যে আপনি কেবল এই নির্দিষ্ট ব্যবসার পণ্য ও সেবা সংক্রান্ত বিষয়ে সাহায্য করতে পারেন এবং তাকে ব্যবসার বিষয় নিয়ে কথা বলতে অনুরোধ করুন।' 
        })
      } else if (contentText) {
        userMessageContent.push({ type: 'text', text: contentText })
      }

      if (message.type === 'image' && imageBase64) {
        userMessageContent.push({
          type: 'image_url',
          image_url: { url: imageBase64 },
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

      console.log(`[webhook-ai] Call to completions model: ${aiModel}`);
      const gptRes = await fetch(chatUrl, {
        method: 'POST',
        headers: customHeaders,
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {
              role: 'system',
              content: `You are "Lamia", an expert, highly polite, and professional sales and support assistant representing this specific business.

CRITICAL RULE FOR MULTI-TENANT SAAS ISOLATION:
Your entire identity, scope of work, and product catalog are STRICTLY limited to the provided "BUSINESS KNOWLEDGE BASE" below. You must never assume, invent, or hallucinate any services, products, or offers that are not explicitly mentioned in the knowledge base.

1. SCOPE OF ASSISTANCE:
- You must carefully analyze the customer's query or sent image against the "BUSINESS KNOWLEDGE BASE".
- If the customer asks about or sends an image of something that is completely unrelated to the products/services listed in the knowledge base (e.g., sending a food picture like sweets/rosogolla to a seed/agricultural business, or asking about electronics at a clothing shop), you MUST politely and gently decline. Clarify in friendly Bangla that this business only deals in [Extract and state the main business scope from the knowledge base] and you cannot assist with other items.
- Never praise, negotiate, or confirm orders for products outside the knowledge base.

2. IN-SCOPE SALES & SUPPORT:
- If the request aligns with the knowledge base, be highly persuasive and friendly. Speak in a warm Bangla/Banglish blend, using respectful terms like "সম্মানিত ক্রেতা".
- Provide clear answers, assist in closing the sale, and offer any discount/combo structures if documented in the knowledge base.

3. FALLBACK WHEN KNOWLEDGE BASE IS EMPTY OR NOT ACCESSIBLE:
- If the "BUSINESS KNOWLEDGE BASE" section below is empty, completely unconfigured, or has no information about the business yet, politely apologize and state that currently you do not have any specific product or business information. Ask the customer how you can assist them regarding their questions (e.g. "আমি আপনাকে কিভাবে সাহায্য করতে পারি?"). Crucially: Never ask the customer how they can help the business (e.g. do not say "আপনি কিভাবে আমাদের সাহায্য করতে চান"). Always offer assistance from the business to the customer.

BUSINESS KNOWLEDGE BASE:
---------------------
${matchedContext || ''}
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
        console.log('[webhook-ai] Success response:', aiReplyText);

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
        console.error('[webhook-ai] completions failed:', errBody)
      }
    } catch (err) {
      console.error('[webhook-ai] execution error:', err)
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
    console.error('[webhook-database] conversation timestamp update fail:', convError)
  }

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
    }).catch((err) => console.error('[webhook-automation] trigger fail:', err))
  }
}

async function parseMessageContent(
  message: WhatsAppMessage,
  accessToken: string
): Promise<{
  contentText: string | null
  mediaUrl: string | null
}> {
  const verifyAndBuildUrl = async (mediaId: string): Promise<string | null> => {
    try {
      await getMediaUrl({ mediaId, accessToken })
      return `/api/whatsapp/media/${mediaId}`
    } catch (error) {
      console.error(`Failed to verify media ${mediaId} with Meta:`, error)
      return `/api/whatsapp/media/${mediaId}`
    }
  }

  switch (message.type) {
    case 'text':
      return {
        contentText: message.text?.body || null,
        mediaUrl: null,
      }

    case 'image':
      if (message.image?.id) {
        return {
          contentText: message.image.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.image.id),
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'video':
      if (message.video?.id) {
        return {
          contentText: message.video.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.video.id),
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'document':
      if (message.document?.id) {
        return {
          contentText:
            message.document.caption || message.document.filename || null,
          mediaUrl: await verifyAndBuildUrl(message.document.id),
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'audio':
      if (message.audio?.id) {
        return {
          contentText: null,
          mediaUrl: await verifyAndBuildUrl(message.audio.id),
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'sticker':
      if (message.sticker?.id) {
        return {
          contentText: null,
          mediaUrl: await verifyAndBuildUrl(message.sticker.id),
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return {
          contentText: locationText,
          mediaUrl: null,
        }
      }
      return { contentText: null, mediaUrl: null }

    case 'reaction':
      return {
        contentText: message.reaction?.emoji || null,
        mediaUrl: null,
      }

    default:
      return {
        contentText: `[Unsupported message type: ${message.type}]`,
        mediaUrl: null,
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