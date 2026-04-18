import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { total_steps } = await req.json()
    if (!total_steps || total_steps < 1) {
      return NextResponse.json({ fact: 'Keep walking — every step adds up!' })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `I have walked ${Number(total_steps).toLocaleString()} steps total. Give me ONE fun, real-world distance comparison — like "you could have walked from NYC to Philadelphia" or "that's the length of the Great Wall of China 0.4 times". Use real, accurate distances. Keep it to 1 sentence, enthusiastic, no markdown, no emojis.`
        }]
      })
    })

    const data = await res.json()
    const fact = data.content?.[0]?.text?.trim()
    return NextResponse.json({ fact: fact || 'Keep walking — every step adds up!' })
  } catch (err: unknown) {
    console.error('steps-fact error:', err)
    return NextResponse.json({ fact: 'Keep walking — every step adds up!' })
  }
}
