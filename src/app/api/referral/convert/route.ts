import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// DORMANT — activate by calling from Stripe webhook when subscription confirmed
export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: referral } = await admin.from('referrals').select('*').eq('referred_id', user_id).eq('converted', false).maybeSingle()
    if (!referral) return NextResponse.json({ ok: false, reason: 'no_referral_found' })

    await admin.from('referrals').update({ converted: true, reward_granted: true }).eq('id', referral.id)

    const { data: p } = await admin.from('profiles').select('free_months_earned, referral_count').eq('id', referral.referrer_id).maybeSingle()
    await admin.from('profiles').update({
      free_months_earned: (p?.free_months_earned || 0) + 1,
      referral_count: (p?.referral_count || 0) + 1,
    }).eq('id', referral.referrer_id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
