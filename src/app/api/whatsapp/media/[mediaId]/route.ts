import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.workspace_id) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp not configured for this workspace' },
        { status: 400 }
      )
    }

    const accessToken = decrypt(config.access_token)

    // ১. মেটা এপিআই থেকে ডাউনলোড লিঙ্ক সংগ্রহ করা হচ্ছে
    const mediaInfo = await getMediaUrl({ mediaId, accessToken })

    let downloadResult: { buffer: Buffer; contentType: string } | null = null
    let attempts = 0
    const maxAttempts = 3
    const delayMs = 1500

    // ২. ব্রাউজার সেশন ক্র্যাশ বা মেটা প্রোপাগেশন ডিলে আটকাতে রেজিলিয়েন্ট ডাইনামিক রিট্রাই লুপ
    while (attempts < maxAttempts) {
      try {
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        const res = await downloadMedia({
          downloadUrl: mediaInfo.url,
          accessToken,
        })

        if (res && res.buffer && res.buffer.byteLength > 500) {
          downloadResult = res
          break
        }
      } catch (err) {
        console.warn(`[media-proxy] Download attempt ${attempts + 1} failed:`, err)
      }
      attempts++
    }

    if (!downloadResult) {
      return NextResponse.json(
        { error: 'Failed to download media file from Meta CDN after retries' },
        { status: 502 }
      )
    }

    const { buffer, contentType } = downloadResult

    // ৩. ক্রোম ও সাফারির সঠিক ডিউরেশন দেখানোর জন্য হেডার ফিক্সড
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || mediaInfo.mimeType || 'application/octet-stream',
        'Content-Length': buffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Error in WhatsApp media GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}