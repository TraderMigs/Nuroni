import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, start_weight, weight_unit, is_public')
    .eq('username', params.username.toLowerCase())
    .maybeSingle()

  if (!profile) return notFound()

  if (!profile.is_public) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg)' }}>
        <div className="mb-4 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--bg-input)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>This profile is private</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>This user has set their profile to private.</p>
        <Link href="/signup" className="btn-primary">Start your journey</Link>
      </div>
    )
  }

  const { data: goal } = await supabase
    .from('goals')
    .select('goal_weight, daily_step_goal, target_date')
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: entries } = await supabase
    .from('entries')
    .select('weight, steps, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(14)

  const currentWeight = entries && entries[0] ? entries[0].weight : profile.start_weight
  const unit = profile.weight_unit
  const lostSoFar = parseFloat((profile.start_weight - currentWeight).toFixed(1))
  const totalToLose = goal ? profile.start_weight - goal.goal_weight : 0
  const pctToGoal = totalToLose > 0 ? Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100))) : 0
  const latestSteps = entries && entries[0] ? entries[0].steps : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Thin top accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))' }} />

      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-5 overflow-x-hidden">
        {/* Branding */}
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Nuroni" style={{ height: '44px', width: 'auto', display: 'block' }} />
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', fontWeight: 500 }}>
            Public journey
          </span>
        </div>

        {/* Profile header */}
        <div>
          <h1 className="text-2xl font-bold mb-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {profile.display_name}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{profile.username} · on Nuroni</p>
        </div>

        {/* Progress bar */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Journey progress</span>
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{pctToGoal}%</span>
          </div>
          <div className="progress-bar mb-3">
            <div className="progress-fill" style={{ width: `${pctToGoal}%` }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Start: {profile.start_weight} {unit}</span>
            <span>{lostSoFar > 0 ? `−${lostSoFar} ${unit}` : 'Just started'}</span>
            {goal && <span>Goal: {goal.goal_weight} {unit}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <div className="stat-value">{currentWeight}</div>
            <div className="stat-label">Current {unit}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: lostSoFar > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
              {lostSoFar > 0 ? `−${lostSoFar}` : '0'}
            </div>
            <div className="stat-label">Lost ({unit})</div>
          </div>
          {goal && (
            <div className="stat-card">
              <div className="stat-value">{goal.goal_weight}</div>
              <div className="stat-label">Goal ({unit})</div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-value">{latestSteps.toLocaleString()}</div>
            <div className="stat-label">Latest steps</div>
          </div>
        </div>

        {/* Recent entries */}
        {entries && entries.length > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Recent entries
            </h2>
            <div className="space-y-2">
              {entries.slice(0, 7).map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.weight} {unit}</span>
                    {entry.steps > 0 && <span style={{ color: 'var(--text-muted)' }}>{entry.steps.toLocaleString()} steps</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card p-5 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Ready to track your own journey?
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Simple. Shareable. Free to start.
          </p>
          <Link href="/signup" className="btn-primary w-full" style={{ display: 'flex' }}>
            Start your journey →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: 'var(--text-muted)' }}>
          Powered by <Link href="/" style={{ color: 'var(--accent-text)' }}>Nuroni</Link> · Track less. Show real progress.
        </p>
      </div>
    </div>
  )
}
