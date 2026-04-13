'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    height: '',
    weight_unit: 'lbs',
    distance_unit: 'miles',
    start_weight: '',
    goal_weight: '',
    daily_step_goal: '8000',
    target_date: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', form.username.toLowerCase())
      .maybeSingle()

    if (existing) {
      setError('That username is already taken. Please choose another.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: form.display_name,
      username: form.username.toLowerCase(),
      height: form.height ? parseFloat(form.height) : null,
      weight_unit: form.weight_unit,
      distance_unit: form.distance_unit,
      start_weight: parseFloat(form.start_weight),
      is_public: true,
    })

    if (profileError) { setError(profileError.message); setLoading(false); return }

    const { error: goalError } = await supabase.from('goals').upsert({
      user_id: user.id,
      goal_weight: parseFloat(form.goal_weight),
      daily_step_goal: parseInt(form.daily_step_goal),
      target_date: form.target_date || null,
    })

    if (goalError) { setError(goalError.message); setLoading(false); return }

    await supabase.from('entries').insert({
      user_id: user.id,
      weight: parseFloat(form.start_weight),
      steps: 0,
    })

    router.push('/progress')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-x-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Nuroni" style={{ height: '44px', width: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: s <= step ? 'var(--accent)' : 'var(--border)' }}
            />
          ))}
        </div>

        <div className="card p-6 animate-fade-in">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Let&apos;s set you up
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Quick setup — under a minute.
                </p>
              </div>

              <div>
                <label className="label">Your name</label>
                <input
                  className="input-base"
                  placeholder="e.g. Alex"
                  value={form.display_name}
                  onChange={e => update('display_name', e.target.value)}
                />
              </div>

              <div>
                <label className="label">
                  Username <span style={{ color: 'var(--text-muted)' }}>(for your public link)</span>
                </label>
                {/* Fixed prefix + input — no overlap */}
                <div
                  className="flex items-center input-base p-0 overflow-hidden"
                  style={{ padding: 0 }}
                >
                  <span
                    className="pl-3 pr-1 text-sm flex-shrink-0 select-none"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                  >
                    /u/
                  </span>
                  <input
                    className="flex-1 bg-transparent outline-none text-sm py-3 pr-3"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                    placeholder="tradermigs"
                    value={form.username}
                    onChange={e => update('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  />
                </div>
                {form.username && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    nuroni.app/u/{form.username}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Weight unit</label>
                  <select
                    className="input-base"
                    value={form.weight_unit}
                    onChange={e => update('weight_unit', e.target.value)}
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <div>
                  <label className="label">Distance unit</label>
                  <select
                    className="input-base"
                    value={form.distance_unit}
                    onChange={e => update('distance_unit', e.target.value)}
                  >
                    <option value="miles">miles</option>
                    <option value="km">km</option>
                  </select>
                </div>
              </div>

              <button
                className="btn-primary w-full"
                onClick={() => setStep(2)}
                disabled={!form.display_name || !form.username}
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Your starting point
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Where are you right now?
                </p>
              </div>

              <div>
                <label className="label">Starting weight ({form.weight_unit})</label>
                <input
                  className="input-base"
                  type="number"
                  step="0.1"
                  placeholder={form.weight_unit === 'lbs' ? '185' : '84'}
                  value={form.start_weight}
                  onChange={e => update('start_weight', e.target.value)}
                />
              </div>

              <div>
                <label className="label">
                  Height{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    (optional, in {form.weight_unit === 'lbs' ? 'inches' : 'cm'})
                  </span>
                </label>
                <input
                  className="input-base"
                  type="number"
                  step="0.1"
                  placeholder={form.weight_unit === 'lbs' ? '68' : '173'}
                  value={form.height}
                  onChange={e => update('height', e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => setStep(3)}
                  disabled={!form.start_weight}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Set your targets
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  What are you working toward?
                </p>
              </div>

              <div>
                <label className="label">Goal weight ({form.weight_unit})</label>
                <input
                  className="input-base"
                  type="number"
                  step="0.1"
                  placeholder={form.weight_unit === 'lbs' ? '160' : '72'}
                  value={form.goal_weight}
                  onChange={e => update('goal_weight', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Daily step goal</label>
                <input
                  className="input-base"
                  type="number"
                  placeholder="8000"
                  value={form.daily_step_goal}
                  onChange={e => update('daily_step_goal', e.target.value)}
                />
              </div>

              <div>
                <label className="label">
                  Target date <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  className="input-base"
                  type="date"
                  value={form.target_date}
                  onChange={e => update('target_date', e.target.value)}
                />
              </div>

              {error && (
                <p
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={loading || !form.goal_weight}
                >
                  {loading ? 'Saving…' : "Let's go 🎯"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
