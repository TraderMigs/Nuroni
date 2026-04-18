'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts'

interface Profile { display_name: string; username: string; weight_unit: string; distance_unit: string; start_weight: number; is_public: boolean; is_plus: boolean }
interface Goal { goal_weight: number; daily_step_goal: number; target_date: string | null }
interface Entry { id: string; weight: number; steps: number; distance: number | null; note: string | null; activities: string[] | null; created_at: string }

const ACTIVITY_OPTIONS = [
  'Walking', 'Jogging', 'Running', 'Cycling', 'Swimming',
  'Weight Training', 'Calisthenics', 'HIIT', 'Yoga', 'Pilates',
  'Jump Rope', 'Aerobics', 'Stretching', 'Boxing', 'Hiking',
  'Sports', 'Dance', 'Martial Arts', 'Other',
]

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

function computeStreak(entries: Entry[]): number {
  if (!entries.length) return 0
  const days = entries.map(e => new Date(e.created_at).toDateString())
  const unique = Array.from(new Set(days))
  let streak = 1
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (unique[0] !== today && unique[0] !== yesterday) return 0
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

function getWeeklySummary(entries: Entry[], unit: string) {
  const cutoff = new Date(Date.now() - 7 * 86400000)
  const week = entries.filter(e => new Date(e.created_at) >= cutoff)
  if (week.length < 2) return null
  const latest = week[0].weight
  const oldest = week[week.length - 1].weight
  const change = parseFloat((oldest - latest).toFixed(1))
  const avgSteps = Math.round(week.reduce((s, e) => s + (e.steps || 0), 0) / week.length)
  return { change, avgSteps, days: week.length }
}

function getMilestone(lostSoFar: number, unit: string, pctToGoal: number): string | null {
  if (pctToGoal >= 100) return `You reached your goal! Incredible work.`
  if (pctToGoal >= 75) return `75% of the way there — keep pushing!`
  if (pctToGoal >= 50) return `Halfway to your goal!`
  if (pctToGoal >= 25) return `25% of the way there — great start!`
  if (lostSoFar >= 20) return `20 ${unit} lost — that's a big deal!`
  if (lostSoFar >= 10) return `10 ${unit} lost — momentum is real!`
  if (lostSoFar >= 5) return `5 ${unit} lost — you're doing it!`
  if (lostSoFar >= 1) return `First pound down — the journey begins!`
  return null
}

function smoothData(data: { date: string; weight: number }[]) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 3), i + 4)
    const avg = parseFloat((slice.reduce((s, x) => s + x.weight, 0) / slice.length).toFixed(1))
    return { ...d, trend: avg }
  })
}

function getPace(entries: Entry[], goalWeight: number): string | null {
  if (entries.length < 7) return null
  const recent = entries.slice(0, 7)
  const oldest = recent[recent.length - 1].weight
  const newest = recent[0].weight
  const weeklyLoss = (oldest - newest)
  if (weeklyLoss <= 0) return null
  const remaining = newest - goalWeight
  if (remaining <= 0) return 'You\'ve already hit your goal!'
  const weeks = Math.ceil(remaining / weeklyLoss)
  if (weeks > 200) return null
  const target = new Date(Date.now() + weeks * 7 * 86400000)
  return `At your current pace, goal in ~${weeks} week${weeks === 1 ? '' : 's'} (${target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
}

function PlusGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="card p-4 text-center" style={{ border: '1px dashed var(--border)' }}>
      <div className="text-2xl mb-2">+</div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Plus+ feature</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Upgrade to unlock this and more for $5/month.</p>
      <button onClick={onUpgrade} className="btn-primary text-sm py-2 px-4">Upgrade to Plus+ </button>
    </div>
  )
}

function daysSinceLastEntry(entries: Entry[]): number | null {
  if (!entries.length) return null
  const last = new Date(entries[0].created_at)
  const now = new Date()
  return Math.floor((now.getTime() - last.getTime()) / 86400000)
}

function getMaxBackdate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function getTodayLocal(): string {
  return new Date().toISOString().split('T')[0]
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
  const [showWeekly, setShowWeekly] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [activitiesInput, setActivitiesInput] = useState<string[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [shareCardFact, setShareCardFact] = useState('')
  const [shareCardFactLoading, setShareCardFactLoading] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [logDate, setLogDate] = useState(getTodayLocal())

  const [weightInput, setWeightInput] = useState('')
  const [stepsInput, setStepsInput] = useState('')
  const [distanceInput, setDistanceInput] = useState('')
  const [stepsExpanded, setStepsExpanded] = useState(false)
  const [lifetimeFact, setLifetimeFact] = useState('')
  const [lifetimeFactLoading, setLifetimeFactLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editSteps, setEditSteps] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editActivities, setEditActivities] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: p }, { data: g }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
    ])

    if (!p) { router.push('/onboarding'); return }
    setProfile(p)
    setGoal(g)
    setEntries(e || [])
    if (e && e[0]) setWeightInput(String(e[0].weight))
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  async function logEntry() {
    if (!weightInput) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Build timestamp from chosen date at noon local time to avoid timezone issues
    const chosenDate = new Date(`${logDate}T12:00:00`)
    const isToday = logDate === getTodayLocal()

    const { error } = await supabase.from('entries').insert({
      user_id: user.id,
      weight: parseFloat(weightInput),
      steps: stepsInput ? parseInt(stepsInput) : 0,
      distance: distanceInput ? parseFloat(distanceInput) : null,
      note: noteInput || null,
      activities: activitiesInput.length > 0 ? activitiesInput : null,
      created_at: isToday ? new Date().toISOString() : chosenDate.toISOString(),
    })
    if (!error) {
      setToast(isToday ? 'Entry logged!' : `Entry logged for ${new Date(logDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}!`)
      setStepsInput('')
      setDistanceInput('')
      setNoteInput('')
      setActivitiesInput([])
      setLogDate(getTodayLocal())
      setNudgeDismissed(true)
      await load()
    }
    setSaving(false)
  }

  async function fetchLifetimeFact(totalSteps: number) {
    if (lifetimeFact || lifetimeFactLoading) return
    setLifetimeFactLoading(true)
    try {
      const res = await fetch('/api/steps-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_steps: totalSteps }),
      })
      const data = await res.json()
      if (data.fact) setLifetimeFact(data.fact)
    } catch { setLifetimeFact('Keep walking — every step adds up!') }
    setLifetimeFactLoading(false)
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id)
    setEditWeight(String(entry.weight))
    setEditSteps(String(entry.steps || ''))
    setEditNote(entry.note || '')
    setEditActivities(entry.activities || [])
    setShowDeleteConfirm(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setShowDeleteConfirm(null)
  }

  async function saveEdit(entryId: string) {
    if (!editWeight) return
    setSavingEdit(true)
    const { error } = await supabase.from('entries').update({
      weight: parseFloat(editWeight),
      steps: editSteps ? parseInt(editSteps) : 0,
      note: editNote || null,
      activities: editActivities.length > 0 ? editActivities : null,
    }).eq('id', entryId)
    if (!error) {
      setToast('Entry updated!')
      setEditingId(null)
      await load()
    }
    setSavingEdit(false)
  }

  async function deleteEntry(entryId: string) {
    setDeletingId(entryId)
    const { error } = await supabase.from('entries').delete().eq('id', entryId)
    if (!error) {
      setToast('Entry deleted')
      setEditingId(null)
      setShowDeleteConfirm(null)
      await load()
    }
    setDeletingId(null)
  }

  async function copyLink() {
    if (!profile) return
    await navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
    setToast('Link copied!')
  }

  async function shareLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    if (navigator.share) {
      await navigator.share({ title: `${profile.display_name}'s journey on Nuroni`, url })
    } else { copyLink() }
  }

  async function openShareCard() {
    setShowShareCard(true)
    if (!shareCardFact && !shareCardFactLoading) {
      const totalSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0)
      if (totalSteps > 0) {
        setShareCardFactLoading(true)
        try {
          const res = await fetch('/api/steps-fact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_steps: totalSteps }),
          })
          const data = await res.json()
          if (data.fact) setShareCardFact(data.fact)
        } catch {}
        setShareCardFactLoading(false)
      }
    }
  }

  async function downloadShareCard() {
    if (!profile) return
    setToast('Generating card...')
    const totalSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0)
    const params = new URLSearchParams({
      username: profile.username,
      streak: String(streak),
      steps: String(totalSteps),
      ...(shareCardFact ? { fact: shareCardFact } : {}),
    })
    const url = `/api/share-card?${params.toString()}`
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `nuroni-${profile.username}-progress.png`
    a.click()
    URL.revokeObjectURL(objectUrl)
    setToast('Share card downloaded!')
    setShowShareCard(false)
  }

  async function shareCard() {
    if (!profile) return
    const url = `/api/share-card?username=${profile.username}`
    if (navigator.share) {
      await navigator.share({
        title: `${profile.display_name}'s Nuroni Progress`,
        text: `Check out my weight loss journey on Nuroni! ${window.location.origin}/u/${profile.username}`,
        url: `${window.location.origin}/u/${profile.username}`,
      })
    } else {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
      setToast('Profile link copied!')
    }
    void url
  }

  function exportCSV() {
    setExportLoading(true)
    const rows = [['Date', 'Weight', 'Steps', 'Distance', 'Note']]
    entries.forEach(e => {
      rows.push([
        new Date(e.created_at).toLocaleDateString(),
        String(e.weight),
        String(e.steps || 0),
        String(e.distance || ''),
        e.note || '',
      ])
    })
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nuroni-progress-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
    setToast('CSV downloaded!')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!profile || !goal) return null

  const isPlus = profile.is_plus
  const currentWeight = entries[0]?.weight ?? profile.start_weight
  const lostSoFar = parseFloat((profile.start_weight - currentWeight).toFixed(1))
  const totalToLose = profile.start_weight - goal.goal_weight
  const pctToGoal = totalToLose > 0 ? Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100))) : 0
  const latestSteps = entries[0]?.steps ?? 0
  const unit = profile.weight_unit
  const distUnit = profile.distance_unit
  const streak = computeStreak(entries)
  const milestone = getMilestone(lostSoFar, unit, pctToGoal)
  const weekly = getWeeklySummary(entries, unit)
  const pace = isPlus ? getPace(entries, goal.goal_weight) : null
  const daysSince = daysSinceLastEntry(entries)
  const showNudge = !nudgeDismissed && daysSince !== null && daysSince >= 2

  const lifetimeSteps = entries.reduce((sum, e) => sum + (e.steps || 0), 0)

  const rawChartData = [...entries].reverse().slice(-14).map(e => ({
    date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
  }))
  const chartData = isPlus ? smoothData(rawChartData) : rawChartData

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 space-y-5 overflow-x-hidden">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {showNudge && (
        <div className="card p-3.5 flex items-center justify-between gap-3 animate-fade-in" style={{ background: 'rgba(45,212,191,0.06)', borderColor: 'rgba(45,212,191,0.25)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0">📅</span>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {daysSince === 2 ? "It's been 2 days — log your weight to keep your streak!" : `${daysSince} days since your last entry. Come back and log!`}
            </p>
          </div>
          <button onClick={() => setNudgeDismissed(true)} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {profile.display_name}
            </h1>
            {isPlus && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: '#0D1117' }}>Plus+</span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your progress</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={copyLink} className="btn-secondary py-2 px-3 text-sm gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <button onClick={openShareCard} className="btn-primary py-2 px-3 text-sm gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      {showShareCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowShareCard(false)}>
          <div className="card p-5 w-full max-w-sm animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Share your progress
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {shareCardFactLoading ? 'Generating your card...' : 'Choose how you want to share'}
            </p>
            <div className="rounded-xl overflow-hidden mb-4 border" style={{ borderColor: 'var(--border)' }}>
              <img
                src={`/api/share-card?username=${profile.username}&streak=${streak}&steps=${entries.reduce((s,e)=>s+(e.steps||0),0)}${shareCardFact ? '&fact=' + encodeURIComponent(shareCardFact) : ''}`}
                alt="Progress card preview"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <div className="space-y-2">
              <button onClick={downloadShareCard} className="btn-primary w-full gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download card
              </button>
              <button onClick={shareLink} className="btn-secondary w-full gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share live link
              </button>
              <button onClick={() => setShowShareCard(false)} className="btn-secondary w-full">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {milestone && lostSoFar > 0 && (
        <div className="card p-3 flex items-center gap-3" style={{ background: 'var(--accent-subtle)', borderColor: 'rgba(45,212,191,0.3)' }}>
          <p className="text-sm font-medium flex-1" style={{ color: 'var(--accent-text)' }}>{milestone}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card flex items-center gap-3">
          <div className="text-2xl">{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '📅'}</div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{streak}</div>
            <div className="stat-label">Day streak</div>
          </div>
        </div>
        <button className="stat-card text-left" onClick={() => setShowWeekly(v => !v)} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="stat-label">This week</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', transform: showWeekly ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {weekly ? (
            <div className="stat-value" style={{ fontSize: '1.25rem', color: weekly.change > 0 ? 'var(--success)' : weekly.change < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {weekly.change > 0 ? `-${weekly.change}` : weekly.change < 0 ? `+${Math.abs(weekly.change)}` : '-'} {unit}
            </div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Log more days</div>
          )}
        </button>
      </div>

      {showWeekly && weekly && (
        <div className="card p-4 animate-fade-in">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Weekly summary</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold" style={{ color: weekly.change > 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-display)' }}>
                {weekly.change > 0 ? `-${weekly.change}` : `+${Math.abs(weekly.change)}`}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit} this week</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{weekly.avgSteps.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>avg steps/day</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{weekly.days}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>days logged</div>
            </div>
          </div>
          <button
            onClick={async () => {
              const text = `My Nuroni week:\n${weekly.change > 0 ? `-${weekly.change}` : `+${Math.abs(weekly.change)}`} ${unit} · ${weekly.avgSteps.toLocaleString()} avg steps · ${weekly.days} days logged\n\nnuroni.app/u/${profile.username}`
              if (navigator.share) await navigator.share({ text })
              else { await navigator.clipboard.writeText(text); setToast('Weekly summary copied!') }
            }}
            className="btn-secondary w-full mt-3 text-sm"
          >
            Share weekly summary
          </button>
        </div>
      )}

      {isPlus && pace && (
        <div className="card p-3.5 flex items-center gap-3" style={{ background: 'var(--accent-subtle)', borderColor: 'rgba(45,212,191,0.2)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-text)' }}>{pace}</p>
        </div>
      )}

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
          <span>{lostSoFar > 0 ? `-${lostSoFar} ${unit} lost` : 'Keep going!'}</span>
          <span>Goal: {goal.goal_weight} {unit}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card"><div className="stat-value">{currentWeight}</div><div className="stat-label">Current {unit}</div></div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: lostSoFar > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
            {lostSoFar > 0 ? `-${lostSoFar}` : lostSoFar === 0 ? '0' : `+${Math.abs(lostSoFar)}`}
          </div>
          <div className="stat-label">Lost ({unit})</div>
        </div>
        <div className="stat-card"><div className="stat-value">{latestSteps.toLocaleString()}</div><div className="stat-label">Latest steps</div></div>
        <div className="stat-card"><div className="stat-value">{goal.daily_step_goal.toLocaleString()}</div><div className="stat-label">Step goal</div></div>
      </div>

      {/* Lifetime Steps Card */}
      {lifetimeSteps > 0 && (
        <div className="card p-4" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              setStepsExpanded(v => !v)
              if (!stepsExpanded) fetchLifetimeFact(lifetimeSteps)
            }}
            className="w-full flex items-center justify-between"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">👣</span>
              <div className="text-left">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Lifetime Steps</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {lifetimeSteps.toLocaleString()}
                </p>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', transform: stepsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {stepsExpanded && (
            <div className="mt-3 pt-3 animate-fade-in" style={{ borderTop: '1px solid var(--border)' }}>
              {lifetimeFactLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Calculating your journey…</p>
                </div>
              ) : lifetimeFact ? (
                <p className="text-sm" style={{ color: 'var(--accent-text)', lineHeight: 1.6 }}>🌍 {lifetimeFact}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Log entry */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {logDate === getTodayLocal() ? 'Log today' : `Logging for ${new Date(logDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Date:</label>
            <input
              type="date"
              className="input-base text-xs py-1 px-2"
              style={{ width: 'auto', minWidth: 0 }}
              value={logDate}
              min={getMaxBackdate()}
              max={getTodayLocal()}
              onChange={e => setLogDate(e.target.value)}
            />
          </div>
        </div>
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
        {isPlus && (
          <div className="mb-3">
            <label className="label">Note <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input className="input-base" placeholder="How are you feeling today?" value={noteInput} onChange={e => setNoteInput(e.target.value)} />
          </div>
        )}
        <div className="mb-3">
          <label className="label">Activities today <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ACTIVITY_OPTIONS.map(a => {
              const active = activitiesInput.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setActivitiesInput(prev =>
                    active ? prev.filter(x => x !== a) : [...prev, a]
                  )}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--bg-input)',
                    color: active ? '#0D1117' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </div>
        <button className="btn-primary w-full" onClick={logEntry} disabled={saving || !weightInput}>
          {saving ? 'Saving...' : logDate === getTodayLocal() ? 'Log entry' : 'Log past entry'}
        </button>
      </div>

      {chartData.length > 1 && (
        <div className="card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Weight trend {isPlus && <span className="text-xs ml-1" style={{ color: 'var(--accent)' }}>+ smoothed</span>}
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} />
              {isPlus && <Line type="monotone" dataKey="trend" stroke="rgba(45,212,191,0.7)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Trend" />}
              <ReferenceLine y={goal.goal_weight} stroke="var(--success)" strokeDasharray="3 3" strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isPlus && entries.length >= 7 && <PlusGate onUpgrade={() => router.push('/plus')} />}

      {isPlus && entries.length > 0 && (
        <button onClick={exportCSV} disabled={exportLoading} className="btn-secondary w-full text-sm gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exportLoading ? 'Exporting...' : 'Export as CSV'}
        </button>
      )}

      {entries.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>History</h2>
          <div className="space-y-1">
            {entries.slice(0, 10).map((entry, i) => (
              <div key={entry.id} className="rounded-xl overflow-hidden" style={{ border: editingId === entry.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                <button
                  className="w-full py-2.5 px-1 flex items-center justify-between text-left"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onClick={() => editingId === entry.id ? cancelEdit() : startEdit(entry)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>Latest</span>}
                    <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm flex-shrink-0">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.weight} {unit}</span>
                    {entry.steps > 0 && <span style={{ color: 'var(--text-muted)' }}>{entry.steps.toLocaleString()}</span>}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', transform: editingId === entry.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>
                {editingId === entry.id && (
                  <div className="px-1 pt-3 pb-2 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Weight ({unit})</label>
                        <input className="input-base" type="number" step="0.1" value={editWeight} onChange={e => setEditWeight(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Steps</label>
                        <input className="input-base" type="number" value={editSteps} onChange={e => setEditSteps(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Note <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                      <input className="input-base" placeholder="How were you feeling?" value={editNote} onChange={e => setEditNote(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Activities</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ACTIVITY_OPTIONS.map(a => {
                          const active = editActivities.includes(a)
                          return (
                            <button key={a} type="button" onClick={() => setEditActivities(prev => active ? prev.filter(x => x !== a) : [...prev, a])}
                              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                              style={{ background: active ? 'var(--accent)' : 'var(--bg-input)', color: active ? '#0D1117' : 'var(--text-secondary)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}>
                              {a}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {showDeleteConfirm === entry.id ? (
                      <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Delete this entry? This cannot be undone.</p>
                        <div className="flex gap-2">
                          <button onClick={() => deleteEntry(entry.id)} disabled={deletingId === entry.id} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer' }}>
                            {deletingId === entry.id ? 'Deleting...' : 'Yes, delete'}
                          </button>
                          <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold btn-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(entry.id)} disabled={savingEdit || !editWeight} className="flex-1 btn-primary py-2 text-xs">{savingEdit ? 'Saving...' : 'Save changes'}</button>
                        <button onClick={() => setShowDeleteConfirm(entry.id)} className="py-2 px-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>Delete</button>
                        <button onClick={cancelEdit} className="py-2 px-3 rounded-xl text-xs font-semibold btn-secondary">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="card p-5 text-center" style={{ border: '1px dashed rgba(45,212,191,0.3)' }}>
          <div className="text-3xl mb-3">👟</div>
          <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Your journey starts here
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Log your first weight and steps above. Even one entry starts your streak and unlocks your progress chart.
          </p>
          <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
            Most members see results within their first 2 weeks of daily logging.
          </p>
        </div>
      )}

      {!isPlus && (
        <button onClick={() => router.push('/plus')} className="w-full card p-4 text-center" style={{ border: '1px solid var(--accent)', cursor: 'pointer' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>Upgrade to Plus+ — $5/month</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Trend line · Pace tracker · Notes · Export · Community</p>
        </button>
      )}
    </div>
  )
}
