import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:nuroniapp@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  )

  // Get current UTC hour — we'll match users whose reminder_time matches
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()

  // Fetch all users with reminders enabled and a push subscription
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, reminder_enabled, reminder_time')
    .eq('reminder_enabled', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const userIds = profiles.map(p => p.id)
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const subMap: Record<string, unknown> = {}
  subs.forEach(s => { subMap[s.user_id] = s.subscription })

  let sent = 0
  const errors: string[] = []

  for (const profile of profiles) {
    if (!profile.reminder_time || !subMap[profile.id]) continue

    // Parse reminder time — stored as "HH:MM" in user's local time
    // We send based on UTC match — users should set time knowing their timezone
    // For simplicity: match hour only (within the hour cron runs)
    const [rHour, rMinute] = profile.reminder_time.split(':').map(Number)

    // Match if current UTC hour+minute is within 5 min of reminder time
    const reminderMinutes = rHour * 60 + rMinute
    const currentMinutes = utcHour * 60 + utcMinute
    const diff = Math.abs(reminderMinutes - currentMinutes)
    if (diff > 5 && diff < 1435) continue // 1435 = 24*60 - 5

    try {
      await webpush.sendNotification(
        subMap[profile.id] as webpush.PushSubscription,
        JSON.stringify({
          title: 'Nuroni — Daily check-in 🏃',
          body: `Hey ${profile.display_name || 'there'}! Time to log your steps and weight.`,
          url: '/progress',
        })
      )
      sent++
    } catch (err) {
      errors.push(String(err))
      // If subscription is expired/invalid, remove it
      await admin.from('push_subscriptions').delete().eq('user_id', profile.id)
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
