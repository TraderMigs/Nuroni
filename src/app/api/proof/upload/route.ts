import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_plus')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_plus) {
      return NextResponse.json({ error: 'Plus+ required' }, { status: 403 })
    }

    // Server-side 24-hour enforcement: check last upload
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('proof_photos')
      .select('id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      const lastUpload = new Date(recent[0].created_at)
      const nextAllowed = new Date(lastUpload.getTime() + 24 * 60 * 60 * 1000)
      return NextResponse.json({
        error: 'already_posted_today',
        next_allowed_at: nextAllowed.toISOString(),
      }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!['Gym', 'Walk', 'Meal', 'Other'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
    )

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `proof/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('chat-media')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = adminClient.storage
      .from('chat-media')
      .getPublicUrl(uploadData.path)

    // Insert into proof_photos
    const { data: photoRow, error: photoError } = await adminClient
      .from('proof_photos')
      .insert({ user_id: user.id, photo_url: publicUrl, category })
      .select()
      .maybeSingle()

    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 })

    // Insert message into chat with media_type = 'proof_photo'
    await adminClient.from('messages').insert({
      user_id: user.id,
      content: '',
      media_url: publicUrl,
      media_type: 'proof_photo',
      payload: { photo_id: photoRow.id, category },
    })

    return NextResponse.json({ success: true, photo_id: photoRow.id, url: publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET: check if user already posted in last 24 hours
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('proof_photos')
      .select('id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recent && recent.length > 0) {
      const lastUpload = new Date(recent[0].created_at)
      const nextAllowed = new Date(lastUpload.getTime() + 24 * 60 * 60 * 1000)
      return NextResponse.json({ can_post: false, next_allowed_at: nextAllowed.toISOString() })
    }

    return NextResponse.json({ can_post: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
