import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'

const COACH_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
])

export async function POST(req: NextRequest) {
  try {
    const { content, user_id, context, from_pill, active_coach_id } = await req.json()
    if (!content || !user_id) return NextResponse.json({ ok: true })

    const isAtCoach = content.toLowerCase().startsWith('@coach')
    const strippedContent = isAtCoach
      ? content.replace(/^@coach\s*/i, '').trim()
      : content

    // Fire if @coach prefix, pill tap, or active coach conversation
    if (!isAtCoach && !from_pill && !active_coach_id) {
      return NextResponse.json({ ok: true })
    }

    if (!strippedContent && !from_pill && !active_coach_id) return NextResponse.json({ ok: true })

    // Locked coach priority: pill > active coach session > keyword match
    let lockedCoachId: string | null = null
    if (from_pill && context && context.length > 0) {
      for (let i = context.length - 1; i >= 0; i--) {
        const msg = context[i]
        if (msg.coach_id && COACH_IDS.has(msg.coach_id) && msg.had_quick_replies) {
          lockedCoachId = msg.coach_id
          break
        }
      }
    }
    // Use active coach session if no pill lock
    if (!lockedCoachId && active_coach_id && COACH_IDS.has(active_coach_id)) {
      lockedCoachId = active_coach_id
    }

    // Use waitUntil so fetch keeps running after response is sent
    waitUntil(
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/coach-reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.COACH_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: strippedContent || content,
          user_id,
          context: context || [],
          locked_coach_id: lockedCoachId,
        }),
      })
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
