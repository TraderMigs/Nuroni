import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'No username' }, { status: 400 })

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, start_weight, weight_unit, is_public')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profile || !profile.is_public) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: goal } = await supabase
    .from('goals')
    .select('goal_weight')
    .eq('user_id', (await supabase.from('profiles').select('id').eq('username', username).maybeSingle()).data?.id)
    .maybeSingle()

  const { data: entries } = await supabase
    .from('entries')
    .select('weight, created_at')
    .eq('user_id', (await supabase.from('profiles').select('id').eq('username', username).maybeSingle()).data?.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const currentWeight = entries?.[0]?.weight ?? profile.start_weight
  const unit = profile.weight_unit
  const lostSoFar = parseFloat((profile.start_weight - currentWeight).toFixed(1))
  const totalToLose = goal ? profile.start_weight - goal.goal_weight : 0
  const pctToGoal = totalToLose > 0 ? Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100))) : 0
  const progressBarWidth = Math.max(4, pctToGoal)

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D1117"/>
      <stop offset="100%" style="stop-color:#161B24"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2DD4BF"/>
      <stop offset="100%" style="stop-color:#14B8A6"/>
    </linearGradient>
    <linearGradient id="glow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:#2DD4BF;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:#2DD4BF;stop-opacity:0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Top glow -->
  <ellipse cx="600" cy="0" rx="500" ry="200" fill="url(#glow)"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>

  <!-- Nuroni branding -->
  <text x="80" y="80" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#2DD4BF" letter-spacing="2">NURONI</text>
  <text x="80" y="105" font-family="system-ui, sans-serif" font-size="14" fill="#556070" letter-spacing="1">Track less. Show real progress.</text>

  <!-- Main display name -->
  <text x="80" y="220" font-family="system-ui, sans-serif" font-size="72" font-weight="800" fill="#F0F4F8">${profile.display_name}</text>
  <text x="80" y="260" font-family="system-ui, sans-serif" font-size="20" fill="#556070">@${profile.username} · on a journey</text>

  <!-- Stats row -->
  <!-- Start weight box -->
  <rect x="80" y="310" width="220" height="110" rx="16" fill="#161B24" stroke="#252D3D" stroke-width="1"/>
  <text x="100" y="345" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#556070" letter-spacing="2">START</text>
  <text x="100" y="395" font-family="system-ui, sans-serif" font-size="42" font-weight="800" fill="#F0F4F8">${profile.start_weight}</text>
  <text x="100" y="415" font-family="system-ui, sans-serif" font-size="14" fill="#556070">${unit}</text>

  <!-- Current weight box -->
  <rect x="320" y="310" width="220" height="110" rx="16" fill="#161B24" stroke="#252D3D" stroke-width="1"/>
  <text x="340" y="345" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#556070" letter-spacing="2">NOW</text>
  <text x="340" y="395" font-family="system-ui, sans-serif" font-size="42" font-weight="800" fill="#F0F4F8">${currentWeight}</text>
  <text x="340" y="415" font-family="system-ui, sans-serif" font-size="14" fill="#556070">${unit}</text>

  <!-- Lost box -->
  <rect x="560" y="310" width="220" height="110" rx="16" fill="#0F2724" stroke="#2DD4BF40" stroke-width="1"/>
  <text x="580" y="345" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#2DD4BF" letter-spacing="2">LOST</text>
  <text x="580" y="395" font-family="system-ui, sans-serif" font-size="42" font-weight="800" fill="#2DD4BF">${lostSoFar > 0 ? `−${lostSoFar}` : '0'}</text>
  <text x="580" y="415" font-family="system-ui, sans-serif" font-size="14" fill="#2DD4BF80">${unit}</text>

  <!-- Goal box -->
  <rect x="800" y="310" width="220" height="110" rx="16" fill="#161B24" stroke="#252D3D" stroke-width="1"/>
  <text x="820" y="345" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#556070" letter-spacing="2">GOAL</text>
  <text x="820" y="395" font-family="system-ui, sans-serif" font-size="42" font-weight="800" fill="#F0F4F8">${goal?.goal_weight ?? '—'}</text>
  <text x="820" y="415" font-family="system-ui, sans-serif" font-size="14" fill="#556070">${unit}</text>

  <!-- Progress bar -->
  <text x="80" y="465" font-family="system-ui, sans-serif" font-size="13" fill="#556070">PROGRESS TO GOAL</text>
  <text x="1020" y="465" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#2DD4BF" text-anchor="end">${pctToGoal}%</text>
  <rect x="80" y="475" width="940" height="10" rx="5" fill="#252D3D"/>
  <rect x="80" y="475" width="${Math.round(progressBarWidth * 9.4)}" height="10" rx="5" fill="url(#accent)"/>

  <!-- CTA -->
  <text x="80" y="580" font-family="system-ui, sans-serif" font-size="16" fill="#2DD4BF">nuroni.app/u/${profile.username}</text>
  <text x="1120" y="580" font-family="system-ui, sans-serif" font-size="14" fill="#252D3D" text-anchor="end">Start your journey at nuroni.app</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
