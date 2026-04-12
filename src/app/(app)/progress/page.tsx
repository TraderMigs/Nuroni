'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

interface Profile { display_name: string; username: string; weight_unit: string; distance_unit: string; start_weight: number; is_public: boolean }
interface Goal { goal_weight: number; daily_step_goal: number; target_date: string | null }
interface Entry { id: string; weight: number; steps: number; distance: number | null; created_at: string }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

export default function ProgressPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [weightInput, setWeightInput] = useState('')
  const [stepsInput, setStepsInput] = useState('')
  const [distanceInput, setDistanceInput] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: p }, { data: g }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ])

    if (!p) { router.push('/onboarding'); return }
    setProfile(p)
    setGoal(g)
    setEntries(e || [])
    if (e && e[0]) setWeightInput(String(e[0].weight))
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function logEntry() {
    if (!weightInput) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('entries').insert({
      user_id: user.id,
      weight: parseFloat(weightInput),
      steps: stepsInput ? parseInt(stepsInput) : 0,
      distance: distanceInput ? parseFloat(distanceInput) : null,
    })
    if (!error) {
      setToast('Entry logged ✓')
      setStepsInput('')
      setDistanceInput('')
      await load()
    }
    setSaving(false)
  }

  async function copyLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    await navigator.clipboard.writeText(url)
    setToast('Link copied!')
  }

  async function shareLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    if (navigator.share) {
      await navigator.share({ title: `${profile.display_name}'s journey on Nuroni`, url })
    } else {
      copyLink()
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!profile || !goal) return null

  const currentWeight = entries[0]?.weight ?? profile.start_weight
  const lostSoFar = parseFloat((profile.start_weight - currentWeight).toFixed(1))
  const totalToLose = profile.start_weight - goal.goal_weight
  const pctToGoal = totalToLose > 0 ? Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100))) : 0
  const latestSteps = entries[0]?.steps ?? 0
  const unit = profile.weight_unit
  const distUnit = profile.distance_unit

  const chartData = [...entries].reverse().slice(-14).map(e => ({
    date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {profile.display_name}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your progress</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="btn-secondary py-2 px-3 text-sm gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy link
          </button>
          <button onClick={shareLink} className="btn-primary py-2 px-3 text-sm gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Progress to goal */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Progress to goal</span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{pctToGoal}%</span>
        </div>
        <div className="progress-bar mb-3">
          <div className="progress-fill" style={{ width: `${pctToGoal}%` }} />
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Start: {profile.start_weight} {unit}</span>
          <span>{lostSoFar > 0 ? `−${lostSoFar} ${unit} lost` : 'Keep going!'}</span>
          <span>Goal: {goal.goal_weight} {unit}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="stat-value">{currentWeight}</div>
          <div className="stat-label">Current {unit}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: lostSoFar > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
            {lostSoFar > 0 ? `−${lostSoFar}` : lostSoFar === 0 ? '0' : `+${Math.abs(lostSoFar)}`}
          </div>
          <div className="stat-label">Lost ({unit})</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{latestSteps.toLocaleString()}</div>
          <div className="stat-label">Latest steps</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{goal.daily_step_goal.toLocaleString()}</div>
          <div className="stat-label">Step goal</div>
        </div>
      </div>

      {/* Log entry */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Log today
        </h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="label">Weight ({unit})</label>
            <input className="input-base" type="number" step="0.1" placeholder="0.0" value={weightInput} onChange={e => setWeightInput(e.target.value)} />
          </div>
          <div>
            <label className="label">Steps</label>
            <input className="input-base" type="number" placeholder="0" value={stepsInput} onChange={e => setStepsInput(e.target.value)} />
          </div>
          <div>
            <label className="label">Dist ({distUnit})</label>
            <input className="input-base" type="number" step="0.01" placeholder="0.0" value={distanceInput} onChange={e => setDistanceInput(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary w-full" onClick={logEntry} disabled={saving || !weightInput}>
          {saving ? 'Saving…' : 'Log entry'}
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Weight trend
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {entries.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            History
          </h2>
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  {i === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                      Latest
                    </span>
                  )}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.weight} {unit}</span>
                  {entry.steps > 0 && <span style={{ color: 'var(--text-muted)' }}>{entry.steps.toLocaleString()} steps</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Log your first entry above to get started.</p>
        </div>
      )}
    </div>
  )
}
