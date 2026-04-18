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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find users whose trial ends in 18-30 hours (day 6 window — runs daily)
  const now = new Date()
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString()
  const in30h = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, display_name, push_subscriptions(subscription)')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', in18h)
    .lte('trial_ends_at', in30h)
    .eq('is_plus', true)

  let sent = 0
  for (const user of users ?? []) {
    const name = user.display_name || 'there'
    for (const sub of (user as { push_subscriptions: { subscription: object }[] }).push_subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: 'Your Nuroni trial ends tomorrow 🔔',
            body: `Hey ${name} — keep your coaches, journal, and community access. Tap to stay Plus+.`,
            url: '/plus',
          })
        )
        sent++
      } catch {
        // expired subscription — skip
      }
    }
  }

  return NextResponse.json({ sent })
}
