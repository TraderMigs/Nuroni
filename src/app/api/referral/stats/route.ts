import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DORMANT — no UI calls this yet
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('referral_code, referral_count, free_months_earned').eq('id', user.id).maybeSingle()
    const { data: referrals } = await supabase.from('referrals').select('converted, created_at').eq('referrer_id', user.id).order('created_at', { ascending: false })
    const origin = req.headers.get('origin') || 'https://nuroni.app'

    return NextResponse.json({
      referral_code: profile?.referral_code,
      referral_link: `${origin}/signup?ref=${profile?.referral_code}`,
      total_referrals: referrals?.length || 0,
      converted: referrals?.filter(r => r.converted).length || 0,
      free_months_earned: profile?.free_months_earned || 0,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
