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

  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, reminder_time, push_subscriptions(subscription)')
    .eq('reminder_enabled', true)
    .eq('reminder_time', currentTime)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0

  for (const user of users ?? []) {
    for (const sub of (user as any).push_subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: 'Nuroni Reminder 💪',
            body: 'Time to log your weight!',
          })
        )
        sent++
      } catch {
        // expired subscription, skip
      }
    }
  }

  return NextResponse.json({ sent })
}
