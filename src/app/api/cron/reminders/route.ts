import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:nuroniapp@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  )

  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, reminder_enabled, reminder_time')
    .eq('reminder_enabled', true)

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', profiles.map(p => p.id))

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const subMap: Record<string, unknown> = {}
  subs.forEach(s => { subMap[s.user_id] = s.subscription })

  let sent = 0

  for (const profile of profiles) {
    if (!profile.reminder_time || !subMap[profile.id]) continue

    const [rHour, rMinute] = profile.reminder_time.split(':').map(Number)
    const reminderMinutes = rHour * 60 + rMinute
    const currentMinutes = utcHour * 60 + utcMinute
    const diff = Math.abs(reminderMinutes - currentMinutes)
    if (diff > 5 && diff < 1435) continue

    try {
      await webpush.sendNotification(
        subMap[profile.id],
        JSON.stringify({
          title: 'Nuroni — Daily check-in 🏃',
          body: `Hey ${profile.display_name || 'there'}! Time to log your steps and weight.`,
          url: '/progress',
        })
      )
      sent++
    } catch {
      await admin.from('push_subscriptions').delete().eq('user_id', profile.id)
    }
  }

  return NextResponse.json({ sent })
}
