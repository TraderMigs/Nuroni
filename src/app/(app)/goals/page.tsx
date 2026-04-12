'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

export default function GoalsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [unit, setUnit] = useState('lbs')

  const [form, setForm] = useState({
    goal_weight: '',
    daily_step_goal: '',
    target_date: '',
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from('profiles').select('weight_unit').eq('id', user.id).maybeSingle(),
      supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    if (p) setUnit(p.weight_unit)
    if (g) setForm({
      goal_weight: String(g.goal_weight),
      daily_step_goal: String(g.daily_step_goal),
      target_date: g.target_date ? g.target_date.split('T')[0] : '',
    })
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('goals').upsert({
      user_id: user.id,
      goal_weight: parseFloat(form.goal_weight),
      daily_step_goal: parseInt(form.daily_step_goal),
      target_date: form.target_date || null,
    })
    setSaving(false)
    if (!error) setToast('Goals saved ✓')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Goals</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>What are you working toward?</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Goal weight ({unit})</label>
          <input className="input-base" type="number" step="0.1" placeholder="160" value={form.goal_weight} onChange={e => setForm(f => ({ ...f, goal_weight: e.target.value }))} />
        </div>

        <div>
          <label className="label">Daily step goal</label>
          <input className="input-base" type="number" placeholder="8000" value={form.daily_step_goal} onChange={e => setForm(f => ({ ...f, daily_step_goal: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Most health guidelines suggest 7,000–10,000 steps/day.</p>
        </div>

        <div>
          <label className="label">Target date <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <input className="input-base" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>

        {form.target_date && form.goal_weight && (
          <div className="rounded-xl p-3" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
              Target: {form.goal_weight} {unit} by {new Date(form.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        <button className="btn-primary w-full" onClick={save} disabled={saving || !form.goal_weight || !form.daily_step_goal}>
          {saving ? 'Saving…' : 'Save goals'}
        </button>
      </div>
    </div>
  )
}
