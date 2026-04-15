import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { content, user_id, context } = await req.json()
    if (!content || !user_id) return NextResponse.json({ ok: true })

    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/coach-reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COACH_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, user_id, context: context || [] }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
