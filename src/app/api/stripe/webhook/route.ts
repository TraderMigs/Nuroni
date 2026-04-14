import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  const getCustomerId = (obj: Stripe.Subscription | Stripe.Checkout.Session): string | null => {
    const c = obj.customer
    if (!c) return null
    return typeof c === 'string' ? c : c.id
  }

  async function getUserId(customerId: string | null, metadata?: Stripe.Metadata | null): Promise<string | null> {
    if (customerId) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (data?.id) return data.id
    }
    const metaUserId = metadata?.supabase_user_id
    if (metaUserId) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', metaUserId)
        .maybeSingle()
      if (data?.id) return data.id
    }
    return null
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = getCustomerId(session)
      const userId = await getUserId(customerId, session.metadata)
      if (!userId) break

      const subId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null

      // Use SECURITY DEFINER RPC — bypasses RLS entirely
      await supabaseAdmin.rpc('grant_plus_to_user', {
        p_user_id: userId,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subId,
      })
      break
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = getCustomerId(sub)
      const userId = await getUserId(customerId, sub.metadata)
      if (!userId) break

      // Use SECURITY DEFINER RPC — bypasses RLS entirely
      await supabaseAdmin.rpc('revoke_plus_from_user', {
        p_user_id: userId,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = getCustomerId(sub)
      const userId = await getUserId(customerId, sub.metadata)
      if (!userId) break
      const isActive = sub.status === 'active' || sub.status === 'trialing'

      if (isActive) {
        await supabaseAdmin.rpc('grant_plus_to_user', {
          p_user_id: userId,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: sub.id,
        })
      } else {
        await supabaseAdmin.rpc('revoke_plus_from_user', {
          p_user_id: userId,
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
