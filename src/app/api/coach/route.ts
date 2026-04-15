import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { content, user_id } = await req.json()
    if (!content || !user_id) return NextResponse.json({ ok: true })

    // Fire and forget — don't await so user isn't blocked
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/coach-reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COACH_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, user_id }),
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
