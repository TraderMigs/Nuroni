import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!caller?.is_admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { target_user_id, is_plus } = await req.json()
    if (!target_user_id) return NextResponse.json({ error: 'Missing target_user_id' }, { status: 400 })

    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
    )

    if (is_plus) {
      await adminClient.rpc('grant_plus_to_user', {
        p_user_id: target_user_id,
        p_stripe_customer_id: null,
        p_stripe_subscription_id: null,
      })
    } else {
      await adminClient.rpc('revoke_plus_from_user', {
        p_user_id: target_user_id,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
