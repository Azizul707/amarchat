import { NextResponse, after } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { getMediaUrl } from '@/lib/whatsapp/meta-api'
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils'
import { runAutomationsForTrigger } from '@/lib/automations/engine'

// WhatsappConfigRow টাইপ-সেফ ইন্টারফেস
interface WhatsappConfigRow {
  id: string
  workspace_id: string
  user_id: string
  phone_number_id: string
  access_token?: string
  verify_token?: string
  openai_api_key?: string
  ai_prompt?: string
  ai_base_url?: string
  ai_model?: string
  app_secret?: string
  status?: string
}

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

// গুগল শিট ডিক্লেয়ারেশন ইন্টারফেস
interface GvizCol {
  label: string
}
interface GvizCell {
  v: string | number | null
  f?: string
}
interface GvizRow {
  c: (GvizCell | null)[]
}

// OpenAI Tool Call টাইপ
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

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

function verifyDynamicSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature) return false
  const parts = signature.split('=')
  if (parts.length !== 2) return false
  const expectedSignature = parts[1]

  const hmac = crypto.createHmac('sha256', appSecret)
  const actualSignature = hmac.update(rawBody).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(actualSignature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

async function safeDownload(url: string, token: string): Promise<ArrayBuffer | null> {
  try {
    console.log('[safeDownload] Initiating download request with curl/7.64.1 User-Agent');
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'curl/7.64.1'
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

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let phoneNumberId = ''
  try {
    phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || ''
  } catch {
    // ignore
  }

  let config: WhatsappConfigRow | null = null
  if (phoneNumberId) {
    const { data } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()
    config = data as WhatsappConfigRow | null
  }

  let decryptedAppSecret = ''
  if (config && config.app_secret) {
    try {
      decryptedAppSecret = decrypt(config.app_secret)
    } catch (err) {
      console.error('[webhook-sig] Failed to decrypt custom app_secret:', err)
    }
  }

  if (!decryptedAppSecret) {
    decryptedAppSecret = process.env.META_APP_SECRET || ''
  }

  if (!verifyDynamicSignature(rawBody, signature, decryptedAppSecret)) {
    console.warn('[webhook] Rejected request: Dynamic signature validation failed.')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

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
      console.log('[webhook-send] WhatsApp response sent successfully.')
    }
  } catch (err) {
    console.error('[webhook-send] Exception during WhatsApp send:', err)
  }
}

async function sendWhatsAppImageMessage(
  phone: string,
  imageUrl: string,
  caption: string,
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
          type: 'image',
          image: { 
            link: imageUrl,
            caption: caption 
          },
        }),
      }
    )
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error('[webhook-send] Meta API image send failed:', errBody)
    } else {
      console.log('[webhook-send] WhatsApp Image response sent successfully.')
    }
  } catch (err) {
    console.error('[webhook-send] Exception during WhatsApp Image send:', err)
  }
}

function cleanImageUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();

  if (cleaned.includes('<img') && cleaned.includes('src=')) {
    const srcMatch = cleaned.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      cleaned = srcMatch[1];
    }
  }

  if (cleaned.includes('i.ibb.co.com')) {
    cleaned = cleaned.replace('i.ibb.co.com', 'i.ibb.co');
  }

  if (cleaned.includes('drive.google.com/file/d/')) {
    const driveMatch = cleaned.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      cleaned = `https://drive.google.com/uc?id=${driveMatch[1]}`;
    }
  }

  return cleaned;
}

async function fetchGoogleSheetInventory(sheetId: string): Promise<string> {
  try {
    console.log('[google-sheets] Fetching inventory rows from Sheet ID:', sheetId)
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Inventory`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google Sheet responded with status: ${res.status}`)
    
    const text = await res.text()
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}') + 1
    if (jsonStart < 0 || jsonEnd < 0) return 'No inventory data found.'
    
    const jsonStr = text.substring(jsonStart, jsonEnd)
    const rawData = JSON.parse(jsonStr)
    
    const cols = rawData.table.cols as GvizCol[]
    const rows = rawData.table.rows as GvizRow[]
    
    if (!rows || rows.length === 0) return 'Inventory is currently empty.'
    
    const headers = cols.map((c) => c?.label || 'Unknown')
    const parsedProducts = rows.map((row) => {
      const productObj: Record<string, string> = {}
      row.c.forEach((cell, idx) => {
        const headerName = headers[idx] || `col_${idx}`
        let cellValue = cell && cell.v !== null ? String(cell.v) : ''
        
        if (headerName.toLowerCase() === 'image_url') {
          cellValue = cleanImageUrl(cellValue)
        }

        productObj[headerName] = cellValue
      })
      return productObj
    })

    return JSON.stringify(parsedProducts, null, 2)
  } catch (err) {
    console.error('[google-sheets] Inventory fetch error:', err)
    return 'Failed to load active product catalog. Tell the customer to try again later.'
  }
}

async function appendOrderToGoogleSheet(appsScriptUrl: string, orderDetails: Record<string, unknown>): Promise<boolean> {
  try {
    console.log('[google-sheets] Appending new order row to Apps Script Web App...')
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderDetails),
    })
    
    if (res.ok) {
      console.log('[google-sheets] Order successfully appended.')
      return true
    }
    console.error('[google-sheets] Append endpoint error:', res.status)
  } catch (err) {
    console.error('[google-sheets] Exception while appending order:', err)
  }
  return false
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
        const maxAttempts = 5
        const delayMs = 2500

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
          
          let whisperModel = 'openai/whisper-large-v3'
          if (aiBaseUrl.includes('groq')) {
            whisperModel = 'whisper-large-v3'
          } else if (aiBaseUrl.includes('api.openai.com')) {
            whisperModel = 'whisper-1'
          }

          let whisperRes: Response;
          const isOpenRouter = aiBaseUrl.includes('openrouter');

          if (isOpenRouter) {
            const base64Audio = Buffer.from(downloadResult).toString('base64');
            const openRouterModel = config.ai_model && config.ai_model.includes('whisper')
              ? config.ai_model
              : 'openai/whisper-large-v3';

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

      // ১. সুরক্ষিত গুগল শিট ইন্টিগ্রেশন চেক
      const { data: sheetsIntegration } = await supabaseAdmin()
        .from('workspace_integrations')
        .select('*')
        .eq('workspace_id', conversation.workspace_id)
        .maybeSingle()

      // **২. ডাইনামিক চ্যাট মেমোরি ফিক্স (Fetching last 15 messages chronological history)**
      const { data: pastMessages, error: historyError } = await supabaseAdmin()
        .from('messages')
        .select('sender_type, content_text')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(15)

      const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (!historyError && pastMessages) {
        const chronological = [...pastMessages].reverse()
        chronological.forEach((msg) => {
          if (msg.content_text) {
            chatHistory.push({
              role: msg.sender_type === 'customer' ? 'user' : 'assistant',
              content: msg.content_text,
            })
          }
        })
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

      const baseSystemPrompt = config.ai_prompt || 'You are an expert sales and support assistant representing this business.'

      const aiTools: unknown[] = []
      if (sheetsIntegration && sheetsIntegration.google_sheet_id) {
        aiTools.push({
          type: 'function',
          function: {
            name: 'search_products',
            description: 'Searches the live Google Sheet inventory catalog to fetch matching product details, sizing, variations, pricing, and product Image URLs.',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Keyword to search in product names or SKU' }
              },
              required: ['query']
            }
          }
        })
        
        if (sheetsIntegration.apps_script_url) {
          aiTools.push({
            type: 'function',
            function: {
              name: 'create_order',
              description: 'Appends a new verified customer order to the merchant\'s live Google Sheet database. CRITICAL: You must collect Customer Name, Phone, Address, Product SKU/Name, and optionally Color/Size/Quantity details before calling this. If some fields are missing, ask the customer for them first.',
              parameters: {
                type: 'object',
                properties: {
                  customer_name: { type: 'string' },
                  mobile: { type: 'string' },
                  address: { type: 'string' },
                  product_sku_or_name: { type: 'string' },
                  quantity: { type: 'number', default: 1 },
                  size: { type: 'string', description: 'Product size variant (e.g. M, L, XL)' },
                  color: { type: 'string', description: 'Product color variant' }
                },
                required: ['customer_name', 'mobile', 'address', 'product_sku_or_name']
              }
            }
          })
        }
      }

      // **৩. আপনার গ্রিনএগ্রি (GreenAgri) প্রম্পটের সফল ডাইনামিক রূপান্তর**
      const aiPayload: Record<string, unknown> = {
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: `${baseSystemPrompt}

Always address the customer politely (called "সম্মানিত গ্রাহক"). 
NEVER save polite terms ("ভাইয়া", "আপু", "স্যার", "Customer") as their actual name in the database.

GREETING & DOMAIN RULES (CRITICAL):
- Greetings: If a customer just says "Hi", "Hello", "Assalamu Alaikum", or "দাম কত?", warmly greet them back in Bangla and ask how you can help them with our products today.
- Domain Restriction: You are limited to discussing our specific business products, services, and ordering. Only use the Out-of-Domain refusal if they explicitly ask about unrelated topics.
- Refusal Example: "দুঃখিত, আমি আমাদের সাপোর্ট এজেন্ট। আমি শুধুমাত্র আমাদের পণ্য এবং সেবা সম্পর্কিত বিষয় ছাড়া অন্য কোনো তথ্য দিতে পারি না।"

PRODUCT INVENTORY & IMAGES (CRITICAL):
- If the customer asks "কী কী পণ্য আছে?", "দাম কত?", or wants to see photos, you MUST immediately call the "search_products" tool.
- Never guess, estimate, or invent product specifications or prices. Always fetch from sheets.
- CRITICAL MEDIA RULE: If you find an image URL during the product search, you MUST output the image URL in this strict bracket format inside your text reply: [MEDIA_URL:https://example.com/product-image.png]. Do not hide or alter this brackets tag; our system reads this token to send native photo attachments on WhatsApp!

NEVER HALLUCINATE:
- You are allowed to provide information ONLY if it exists in the provided Business Knowledge Base or live Google Sheets catalog. If the info is missing, politely say you do not have that specific information.

ORDER FUNNEL & STRICT DATA COLLECTION:
- Act like a smart telesales executive. To confirm an order, you MUST collect 3 distinct pieces of information:
  1. Real Name (আসল নাম).
  2. 11-digit Phone Number (Must start with 01).
  3. Full Address (Must contain area/village, thana, district).
- Step 1: If they express interest or select a package, DO NOT CONFIRM. Actively ask for their missing details: "অর্ডারটি কনফার্ম করতে দয়া করে আপনার সুন্দর নামটি, কন্টাক্ট নাম্বার এবং সম্পূর্ণ ঠিকানাটি দিন।"
- Step 2 (Partial Info Validation):
  * If they give a phone number and address but NO name, reply: "ধন্যবাদ সম্মানিত গ্রাহক! কুরিয়ারের জন্য দয়া করে আপনার আসল নামটি জানাবেন।"
  * If the address is too short, ask for full address (area, thana, district).
  * If the phone number is invalid, ask for a valid 11-digit number starting with 01.

ORDER CONFIRMATION & SAVING PROTOCOL:
- ONLY when you have the Real Name, Phone Number, Full Address, and Product Choice in the chat:
  * FIRST: Use the 'create_order' tool (Google Sheets Append) to save their data. Pass the exact real name, phone, address, and product.
  * SECOND: After the tool saves the data, reply with the final confirmation and mini-invoice. Format the bill neatly using LINE BREAKS.
  * Never use "BDT". Always use "টাকা". Use "আসসালামু আলাইকুম", "ইনশাআল্লাহ", "আলহামদুলিল্লাহ" naturally. Always use Line Breaks (Enter) for invoices.

HUMAN HANDOVER:
- If a customer becomes angry, confused, or asks to talk to a human, say: "আমি এখনই আমাদের একজন এক্সপার্টকে আপনার সাথে কানেক্ট করে দিচ্ছি। দয়া করে একটু অপেক্ষা করুন।" Then stop replying.`
          },
          // পূর্ববর্তী চ্যাট ইতিহাস ডাইনামিকালি ইনজেক্ট করা হচ্ছে
          ...chatHistory.filter((h) => h.content !== contentText),
          {
            role: 'user',
            content: userMessageContent
          }
        ],
        max_tokens: 450,
        temperature: 0.7,
      }

      if (aiTools.length > 0) {
        aiPayload.tools = aiTools
      }

      const gptRes = await fetch(chatUrl, {
        method: 'POST',
        headers: customHeaders,
        body: JSON.stringify(aiPayload),
      })

      if (gptRes.ok) {
        const gptData = await gptRes.json()
        const choice = gptData.choices[0]
        let aiMessage = choice.message

        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
          console.log('[webhook-ai] Tool call requested by GPT model.');
          const toolResults: unknown[] = []

          for (const toolCallRaw of aiMessage.tool_calls) {
            const toolCall = toolCallRaw as ToolCall
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)

            let resultText = ''

            if (functionName === 'search_products' && sheetsIntegration?.google_sheet_id) {
              resultText = await fetchGoogleSheetInventory(sheetsIntegration.google_sheet_id)
            } else if (functionName === 'create_order' && sheetsIntegration?.apps_script_url) {
              const success = await appendOrderToGoogleSheet(sheetsIntegration.apps_script_url, functionArgs)
              resultText = success ? 'Success: Order appended' : 'Error: Append failed'
            }

            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: resultText,
            })
          }

          console.log('[webhook-ai] Submitting tool execution feedback to completions API...');
          const secondRes = await fetch(chatUrl, {
            method: 'POST',
            headers: customHeaders,
            body: JSON.stringify({
              model: aiModel,
              messages: [
                ...aiPayload.messages as Array<{ role: string; content: unknown }>,
                aiMessage,
                ...toolResults,
              ],
              max_tokens: 400,
              temperature: 0.7,
            }),
          })

          if (secondRes.ok) {
            const secondData = await secondRes.json()
            if (secondData) {
              aiMessage = secondData.choices[0].message
            }
          } else {
            const errBody = await secondRes.json().catch(() => ({}))
            console.error('[webhook-ai] Tool submit completions failed:', errBody)
          }
        }

        const aiReplyText = aiMessage.content || '[নিরাপত্তাজনিত কারণে মেসেজ তৈরি করা যায়নি]'
        console.log('[webhook-ai] Success response:', aiReplyText);

        const mediaRegex = /\[MEDIA_URL:(https?:\/\/[^\]]+)\]/i
        const mediaMatch = aiReplyText.match(mediaRegex)

        if (mediaMatch && mediaMatch[1]) {
          const imageUrl = cleanImageUrl(mediaMatch[1].trim())
          const cleanCaption = aiReplyText.replace(mediaRegex, '').trim()
          
          await sendWhatsAppImageMessage(senderPhone, imageUrl, cleanCaption, phoneNumberId, accessToken)
        } else {
          await sendWhatsAppMessage(senderPhone, aiReplyText, phoneNumberId, accessToken)
        }

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

  const { data: profile = null } = await supabaseAdmin()
    .from('profiles')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: newConv = null, error: createError } = await supabaseAdmin()
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