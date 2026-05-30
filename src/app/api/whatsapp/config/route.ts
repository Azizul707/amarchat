import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whatsapp/config
 *
 * Used by the "Test API Connection" button and by the page to check
 * whether the saved config is healthy.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching whatsapp_config:', configError)
      return NextResponse.json(
        { connected: false, reason: 'db_error', message: 'Failed to fetch configuration' },
        { status: 200 }
      )
    }

    if (!config) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message: 'No WhatsApp configuration saved yet. Fill in the form and click Save Configuration.',
        },
        { status: 200 }
      )
    }

    let accessToken: string
    try {
      accessToken = decrypt(config.access_token)
    } catch (err) {
      console.error('[whatsapp/config GET] Token decryption failed:', err)
      return NextResponse.json(
        {
          connected: false,
          reason: 'token_corrupted',
          needs_reset: true,
          message:
            'The stored access token cannot be decrypted with the current ENCRYPTION_KEY. Click "Reset Configuration" below, then re-save.',
        },
        { status: 200 }
      )
    }

    // Validate credentials against Meta (with user agent bypass)
    try {
      const phoneInfo = await verifyPhoneNumber({
        phoneNumberId: config.phone_number_id,
        accessToken,
      })
      return NextResponse.json({ connected: true, phone_info: phoneInfo })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[whatsapp/config GET] Meta API verification failed:', message)
      return NextResponse.json(
        {
          connected: false,
          reason: 'meta_api_error',
          message: `Meta API rejected the credentials: ${message}`,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in WhatsApp config GET:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/whatsapp/config
 *
 * Saves or updates the WhatsApp config for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phone_number_id, waba_id, access_token, verify_token, app_secret } = body

    if (!phone_number_id) {
      return NextResponse.json(
        { error: 'phone_number_id is required' },
        { status: 400 }
      )
    }

    // আগের কোনো কনফিগ আছে কি না রিড করা হচ্ছে
    const { data: existing, error: fetchErr } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      console.error('Failed to fetch existing config:', fetchErr)
    }

    if (!existing && !access_token) {
      return NextResponse.json(
        { error: 'access_token is required for initial configuration setup' },
        { status: 400 }
      )
    }

    // ৩. টোকেন ডিক্রিপশন ও মেটা কানেকশন ভেরিফিকেশন ফ্লো
    let tokenToVerify = access_token
    if (!tokenToVerify && existing) {
      try {
        tokenToVerify = decrypt(existing.access_token)
      } catch (err) {
        console.error('Decryption of existing token failed:', err)
        return NextResponse.json({ error: 'Stored token decryption failed' }, { status: 500 })
      }
    }

    if (!tokenToVerify) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    let phoneInfo
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: tokenToVerify,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API verification failed during save:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 400 }
      )
    }

    // ৪. ডাইনামিকলি এনক্রিপশন প্রসেসিং
    let encryptedAccessToken = existing?.access_token || ''
    if (access_token) {
      try {
        encryptedAccessToken = encrypt(access_token)
      } catch (err) {
        console.error('Access Token Encryption failed:', err)
        return NextResponse.json({ error: 'Failed to encrypt access token.' }, { status: 500 })
      }
    }

    let encryptedVerifyToken = existing?.verify_token || null
    if (verify_token) {
      try {
        encryptedVerifyToken = encrypt(verify_token)
      } catch (err) {
        console.error('Verify Token Encryption failed:', err)
        return NextResponse.json({ error: 'Failed to encrypt verify token.' }, { status: 500 })
      }
    }

    let encryptedAppSecret = existing?.app_secret || null
    if (app_secret) {
      try {
        encryptedAppSecret = encrypt(app_secret)
      } catch (err) {
        console.error('App Secret Encryption failed:', err)
        return NextResponse.json({ error: 'Failed to encrypt App Secret.' }, { status: 500 })
      }
    }

    // ৫. ওনারের workspace_id রিড করে সিকিউরড মাল্টি-টেন্যান্ট ভ্যালু জেনারেশন
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const workspace_id = profile?.workspace_id || null

    if (existing) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update({
          phone_number_id,
          waba_id: waba_id || null,
          access_token: encryptedAccessToken,
          verify_token: encryptedVerifyToken,
          app_secret: encryptedAppSecret, // মেটা অ্যাপ সিক্রেট কলাম আপডেট
          status: 'connected',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating whatsapp_config:', updateError)
        return NextResponse.json(
          { error: 'Failed to update configuration' },
          { status: 500 }
        )
      }
    } else {
      const { error: insertError } = await supabase
        .from('whatsapp_config')
        .insert({
          user_id: user.id,
          workspace_id, // সলিড টেন্যান্ট আইসোলেশন
          phone_number_id,
          waba_id: waba_id || null,
          access_token: encryptedAccessToken,
          verify_token: encryptedVerifyToken,
          app_secret: encryptedAppSecret, // মেটা অ্যাপ সিক্রেট কলাম ইনসার্ট
          status: 'connected',
          connected_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error inserting whatsapp_config:', insertError)
        return NextResponse.json(
          { error: 'Failed to save configuration' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, phone_info: phoneInfo })
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp/config
 *
 * Removes the authenticated user's WhatsApp configuration row.
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting whatsapp_config:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}