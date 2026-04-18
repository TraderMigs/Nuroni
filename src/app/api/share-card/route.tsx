import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return new Response('No username', { status: 400 })
  const streakParam = searchParams.get('streak') || '0'
  const stepsParam = searchParams.get('steps') || '0'
  const factParam = searchParams.get('fact') || ''
  const streak = parseInt(streakParam)
  const lifetimeSteps = parseInt(stepsParam)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, start_weight, weight_unit, is_public')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profile || !profile.is_public) {
    return new Response('Not found', { status: 404 })
  }

  const { data: goal } = await supabase
    .from('goals')
    .select('goal_weight')
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: entries } = await supabase
    .from('entries')
    .select('weight')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const currentWeight = entries?.[0]?.weight ?? profile.start_weight
  const unit = profile.weight_unit
  const lostSoFar = parseFloat((profile.start_weight - currentWeight).toFixed(1))
  const totalToLose = goal ? profile.start_weight - goal.goal_weight : 0
  const pctToGoal = totalToLose > 0 ? Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100))) : 0
  const progressBarFill = Math.max(2, pctToGoal)
  const stepMiles = lifetimeSteps > 0 ? (lifetimeSteps * 0.000473).toFixed(0) : '0'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0D1117 0%, #161B24 100%)',
          padding: '0',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top teal accent bar */}
        <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #2DD4BF, #14B8A6)', display: 'flex' }} />

        {/* Top glow */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%)',
          transform: 'translateX(-50%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '80px', flex: 1 }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '80px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: '#2DD4BF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '24px', height: '24px', background: '#0D1117', borderRadius: '50%', display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#2DD4BF', letterSpacing: '3px' }}>NURONI</span>
              <span style={{ fontSize: '14px', color: '#556070', letterSpacing: '1px' }}>Track less. Show real progress.</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '70px' }}>
            <span style={{ fontSize: '96px', fontWeight: 900, color: '#F0F4F8', lineHeight: 1, marginBottom: '12px' }}>
              {profile.display_name}
            </span>
            <span style={{ fontSize: '24px', color: '#556070' }}>@{profile.username} · on a journey</span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
            {[
              { label: 'START', value: String(profile.start_weight), sub: unit, color: '#F0F4F8', bg: '#161B24', border: '#252D3D' },
              { label: 'NOW', value: String(currentWeight), sub: unit, color: '#F0F4F8', bg: '#161B24', border: '#252D3D' },
              { label: 'LOST', value: lostSoFar > 0 ? `−${lostSoFar}` : '0', sub: unit, color: '#2DD4BF', bg: '#0F2724', border: '#2DD4BF40' },
              { label: 'GOAL', value: goal?.goal_weight ? String(goal.goal_weight) : '—', sub: unit, color: '#F0F4F8', bg: '#161B24', border: '#252D3D' },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, background: stat.bg,
                border: `1px solid ${stat.border}`,
                borderRadius: '20px', padding: '30px 28px',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#556070', letterSpacing: '2.5px' }}>{stat.label}</span>
                <span style={{ fontSize: '52px', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
                <span style={{ fontSize: '16px', color: stat.color === '#2DD4BF' ? '#2DD4BF80' : '#556070' }}>{stat.sub}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#556070', letterSpacing: '2px' }}>PROGRESS TO GOAL</span>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#2DD4BF' }}>{pctToGoal}%</span>
            </div>
            <div style={{ height: '14px', background: '#252D3D', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${progressBarFill}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2DD4BF, #14B8A6)',
                borderRadius: '999px',
                display: 'flex',
              }} />
            </div>
          </div>

          {/* Streak + Steps row */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '36px' }}>
            {streak > 0 && (
              <div style={{
                flex: 1, background: '#161B24', border: '1px solid #252D3D',
                borderRadius: '20px', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#556070', letterSpacing: '2.5px' }}>STREAK</span>
                <span style={{ fontSize: '52px', fontWeight: 900, color: '#F0F4F8', lineHeight: 1 }}>
                  {streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '📅'} {streak}
                </span>
                <span style={{ fontSize: '16px', color: '#556070' }}>days</span>
              </div>
            )}
            {lifetimeSteps > 0 && (
              <div style={{
                flex: 1, background: '#161B24', border: '1px solid #252D3D',
                borderRadius: '20px', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#556070', letterSpacing: '2.5px' }}>LIFETIME STEPS</span>
                <span style={{ fontSize: '42px', fontWeight: 900, color: '#F0F4F8', lineHeight: 1 }}>{lifetimeSteps.toLocaleString()}</span>
                <span style={{ fontSize: '16px', color: '#556070' }}>≈ {Number(stepMiles).toLocaleString()} miles walked</span>
              </div>
            )}
          </div>

          {/* Fun fact */}
          {factParam && (
            <div style={{
              background: '#0F2724', border: '1px solid #2DD4BF40',
              borderRadius: '20px', padding: '28px 32px', marginBottom: '40px',
              display: 'flex', alignItems: 'flex-start', gap: '16px',
            }}>
              <span style={{ fontSize: '28px', flexShrink: 0 }}>🌍</span>
              <span style={{ fontSize: '22px', color: '#2DD4BF', lineHeight: 1.5, fontStyle: 'italic' }}>{factParam}</span>
            </div>
          )}

          {/* Footer CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '22px', color: '#2DD4BF', fontWeight: 600 }}>nuroni.app/u/{profile.username}</span>
            <div style={{
              background: '#2DD4BF', borderRadius: '14px', padding: '16px 32px',
              display: 'flex', alignItems: 'center',
            }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0D1117' }}>Start your journey →</span>
            </div>
          </div>

        </div>

        {/* Bottom accent bar */}
        <div style={{ width: '100%', height: '6px', background: 'linear-gradient(90deg, #2DD4BF, #14B8A6)', display: 'flex' }} />
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}
