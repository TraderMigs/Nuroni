import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Find unconverted referral for this user
    const { data: referral } = await admin
      .from('referrals')
      .select('*')
      .eq('referred_id', user_id)
      .eq('converted', false)
      .maybeSingle()

    if (!referral) return NextResponse.json({ ok: false, reason: 'no_referral_found' })

    // Mark referral as converted
    await admin.from('referrals').update({ converted: true, reward_granted: true }).eq('id', referral.id)

    // Update referrer's count and free months earned
    const { data: referrerProfile } = await admin
      .from('profiles')
      .select('free_months_earned, referral_count, stripe_subscription_id')
      .eq('id', referral.referrer_id)
      .maybeSingle()

    await admin.from('profiles').update({
      free_months_earned: (referrerProfile?.free_months_earned || 0) + 1,
      referral_count: (referrerProfile?.referral_count || 0) + 1,
    }).eq('id', referral.referrer_id)

    // Apply 1 free month to referrer's Stripe subscription via trial extension
    if (referrerProfile?.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(referrerProfile.stripe_subscription_id)
        if (sub.status === 'active' || sub.status === 'trialing') {
          // Add 30 days to the current period end
          const currentPeriodEnd = sub.current_period_end
          const newPeriodEnd = currentPeriodEnd + (30 * 24 * 60 * 60) // 30 days in seconds
          await stripe.subscriptions.update(referrerProfile.stripe_subscription_id, {
            trial_end: newPeriodEnd,
            proration_behavior: 'none',
          })
        }
      } catch (stripeErr) {
        // Log but don't fail — DB update already succeeded
        console.error('Stripe trial extension failed:', stripeErr)
      }
    }

    return NextResponse.json({ ok: true, referrer_id: referral.referrer_id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
