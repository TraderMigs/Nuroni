import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// DORMANT — not called from UI yet. Ready to activate.
export async function POST(req: NextRequest) {
  try {
    const { referral_code, new_user_id } = await req.json()
    if (!referral_code || !new_user_id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: referrer } = await admin.from('profiles').select('id').eq('referral_code', referral_code.toLowerCase()).maybeSingle()
    if (!referrer) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
    if (referrer.id === new_user_id) return NextResponse.json({ ok: false, reason: 'self_referral' })

    const { data: existing } = await admin.from('referrals').select('id').eq('referred_id', new_user_id).maybeSingle()
    if (existing) return NextResponse.json({ ok: false, reason: 'already_referred' })

    await admin.from('referrals').insert({ referrer_id: referrer.id, referred_id: new_user_id, referral_code, converted: false, reward_granted: false })
    await admin.from('profiles').update({ referred_by: referral_code }).eq('id', new_user_id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
