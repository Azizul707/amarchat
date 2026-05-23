import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils'

// সুপাবেস সার্ভিস একাউন্ট ক্লায়েন্ট তৈরি
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // নিরাপত্তা যাচাই
    const secretHeader = request.headers.get('x-webhook-secret')
     // 👈 এই দুটি ডিবাগ লাইন এখানে বসিয়ে সেভ করুন
    console.log("সুপাবেস থেকে আসা সিক্রেট:", secretHeader);
    console.log("এনভায়রনমেন্ট ফাইল থেকে পাওয়া সিক্রেট:", process.env.WEBHOOK_SECRET_KEY);


    if (secretHeader !== process.env.WEBHOOK_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      
      
    }

    const body = await request.json()
    const { record, type, table } = body

    // কাস্টমারের মেসেজ এবং ইনসার্ট ইভেন্ট নিশ্চিত করা
    if (type !== 'INSERT' || table !== 'messages' || record.sender_type !== 'customer') {
      return NextResponse.json({ success: true, message: 'Ignored non-customer insert' })
    }

    const conversationId = record.conversation_id
    const customerMessageText = record.content_text

    if (!conversationId || !customerMessageText) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // ১. কনভারসেশন রিড করে দেখা চ্যাটে 'ai_active' ট্রু আছে কি না [1.2.7]
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

    // ২. ওনারের হোয়াটসঅ্যাপ কনফিগ থেকে ওপেনএআই এপিআই কি, এআই প্রম্পট, ডাইনামিক বেস ইউআরএল ও মডেল তুলে আনা [1, 1.2.7]
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
    const aiBaseUrl = config.ai_base_url || 'https://api.openai.com/v1' // ডাইনামিক বেস ইউআরএল (OpenAI/OpenRouter) [1.2.7]
    const aiModel = config.ai_model || 'gpt-4o-mini' // ডাইনামিক এআই মডেল [1.2.7]

    // ৩. চ্যাট কন্টেক্সট ধরে রাখার জন্য সর্বশেষ ১০টি মেসেজ হিস্ট্রি রিড করা [1.2.7]
    const { data: history, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('sender_type, content_text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Failed to fetch conversation history:', historyError)
    }

    // ওপেনএআই এপিআই মেমোরি ফরম্যাটে চ্যাট কন্টেক্সট সাজানো
    const chatMemory = (history || [])
      .reverse()
      .map((m) => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.content_text || '',
      }))

    // ৪. ডাইনামিক এআই প্রোভাইডার কল করা (OpenAI বা OpenRouter) [1.2.7]
    // স্ল্যাশ বা ব্যাকস্ল্যাশ হ্যান্ডলিং করে নির্ভুল ইউআরএল পাথ তৈরি করা
    const sanitizedBaseUrl = aiBaseUrl.replace(/\/$/, '')
    const apiUrl = `${sanitizedBaseUrl}/chat/completions`

    // OpenRouter-এর জন্য অপশনাল কিন্তু স্ট্যান্ডার্ড রিকোয়েস্ট হেডার
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
        model: aiModel, // ডাইনামিকালি ব্যবহারকারীর ডিফাইন করা মডেল পাস করা হচ্ছে [1.2.7]
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

    // ৫. মেটা ক্লাউড এপিআই-এর মাধ্যমে জেনারেট হওয়া রিপ্লাই কাস্টমারকে সেন্ড করা [1.2.7]
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

    // ৬. জেনারেট হওয়া এআই রিপ্লাই মেসেজটি সুপাবেস ডাটাবেসে 'bot' টাইপে সেভ করা [1.2.7]
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

    // ৭. কনভারসেশন লাস্ট মেসেজ আপডেট
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_text: aiReplyText,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return NextResponse.json({ success: true, ai_reply: aiReplyText, wa_message_id: waMessageId })
  } catch (error: any) {
    console.error('Error in AI Responder POST:', error.message || error)
    return NextResponse.json({ error: error.message || 'Failed to process AI response' }, { status: 500 })
  }
}