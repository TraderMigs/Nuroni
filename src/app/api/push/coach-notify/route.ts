import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:nuroniapp@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.COACH_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user_id, coach_name, reply_preview } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'No user_id' }, { status: 400 })

    // Get push subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: `${coach_name || 'Your Coach'} replied 💬`,
            body: reply_preview ? reply_preview.slice(0, 100) : 'Tap to see the response.',
            url: '/chat',
          })
        )
        sent++
      } catch {
        // expired subscription — ignore
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
