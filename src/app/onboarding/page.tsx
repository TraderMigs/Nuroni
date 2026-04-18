'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DIET_OPTIONS = [
  'Standard', 'Vegetarian', 'Vegan', 'Pescatarian',
  'Keto', 'Ketovore', 'Carnivore', 'Mediterranean',
  'Paleo', 'Intermittent Fasting', 'Gluten-Free', 'Dairy-Free', 'Other',
]

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    height: '',
    weight_unit: 'lbs',
    distance_unit: 'miles',
    start_weight: '',
    goal_weight: '',
    daily_step_goal: '8000',
    is_public: true,
    diet_type: '',
    diet_custom: '',
  })

  function set(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const username = form.username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!username) { setError('Username is required'); setSaving(false); return }

    const { error: pErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: form.display_name || 'Friend',
      username,
      height: form.height ? parseFloat(form.height) : null,
      weight_unit: form.weight_unit,
      distance_unit: form.distance_unit,
      start_weight: parseFloat(form.start_weight),
      is_public: form.is_public,
      diet_type: form.diet_type || null,
      diet_custom: form.diet_type === 'Other' ? form.diet_custom : null,
    })

    if (pErr) { setError(pErr.message); setSaving(false); return }

    await supabase.from('goals').upsert({
      user_id: user.id,
      goal_weight: parseFloat(form.goal_weight),
      daily_step_goal: parseInt(form.daily_step_goal),
    })

    // Insert a personal welcome message from Coach Maya
    const coachMayaId = '00000000-0000-0000-0000-000000000001'
    const name = form.display_name || 'there'
    await supabase.from('messages').insert({
      user_id: coachMayaId,
      content: `Hey ${name}! I'm Coach Maya. I'm here to help you with your fat loss and step goals. Type @coach any time you have a question, or just start chatting — I've got you. Welcome to Nuroni! 💪`,
      media_url: null,
      media_type: null,
      quick_replies: ['What should I focus on first?', 'How many steps should I walk?', 'Tell me more about this app'],
      reply_to_user_id: user.id,
    })

    router.push('/chat')
  }

  const unit = form.weight_unit

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Nuroni" style={{ height: '40px', width: 'auto', display: 'block', margin: '0 auto 1rem' }} />
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: step === i ? '24px' : '8px', background: step >= i ? 'var(--accent)' : 'var(--border)' }} />
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Step {step} of 5</p>
        </div>

        <div className="card p-6 animate-fade-in">

          {/* Step 1 — Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Let's set up your profile
              </h2>
              <div>
                <label className="label">Display name</label>
                <input className="input-base" placeholder="What should we call you?" value={form.display_name} onChange={e => set('display_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Username</label>
                <input className="input-base" placeholder="yourname (no spaces)" value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
              </div>
              <div>
                <label className="label">Units</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Weight</label>
                    <div className="flex gap-2">
                      {['lbs', 'kg'].map(u => (
                        <button key={u} onClick={() => set('weight_unit', u)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.weight_unit === u ? 'btn-primary' : 'btn-secondary'}`}>{u}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Distance</label>
                    <div className="flex gap-2">
                      {['miles', 'km'].map(u => (
                        <button key={u} onClick={() => set('distance_unit', u)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.distance_unit === u ? 'btn-primary' : 'btn-secondary'}`}>{u}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => set('is_public', !form.is_public)} className="flex-shrink-0">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.is_public ? '' : ''}`} style={{ background: form.is_public ? 'var(--accent)' : 'var(--border)' }}>
                    <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform" style={{ left: form.is_public ? '20px' : '4px' }} />
                  </div>
                </button>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Public profile</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Let others find and follow your journey</p>
                </div>
              </div>
              <button className="btn-primary w-full" onClick={() => { if (!form.username) { setError('Username required'); return } setError(''); setStep(2) }} disabled={!form.display_name}>Next →</button>
              {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
          )}

          {/* Step 2 — Weight & Goals */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Your weight journey
              </h2>
              <div>
                <label className="label">Current weight ({unit})</label>
                <input className="input-base" type="number" step="0.1" placeholder="0.0" value={form.start_weight} onChange={e => set('start_weight', e.target.value)} />
              </div>
              <div>
                <label className="label">Goal weight ({unit})</label>
                <input className="input-base" type="number" step="0.1" placeholder="0.0" value={form.goal_weight} onChange={e => set('goal_weight', e.target.value)} />
              </div>
              <div>
                <label className="label">Daily step goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {['5000', '8000', '10000', '12000', '15000', '20000'].map(s => (
                    <button key={s} onClick={() => set('daily_step_goal', s)} className={`py-2 rounded-lg text-sm font-medium ${form.daily_step_goal === s ? 'btn-primary' : 'btn-secondary'}`}>
                      {parseInt(s).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary flex-1" onClick={() => { if (!form.start_weight || !form.goal_weight) { setError('Enter both weights'); return } setError(''); setStep(3) }}>Next →</button>
              </div>
              {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
          )}

          {/* Step 3 — Diet type */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  How do you eat?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Optional — helps coaches understand your approach.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => set('diet_type', form.diet_type === d ? '' : d)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: form.diet_type === d ? 'var(--accent)' : 'var(--bg-input)',
                      color: form.diet_type === d ? '#0D1117' : 'var(--text-secondary)',
                      border: `1px solid ${form.diet_type === d ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {form.diet_type === 'Other' && (
                <div>
                  <label className="label">Describe your diet <span style={{ color: 'var(--text-muted)' }}>(max 20 chars)</span></label>
                  <input className="input-base" placeholder="e.g. Raw food, OMAD..." maxLength={20} value={form.diet_custom} onChange={e => set('diet_custom', e.target.value)} />
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary flex-1" onClick={() => setStep(4)}>Next →</button>
              </div>
              <button className="btn-secondary w-full text-sm" onClick={() => setStep(4)} style={{ opacity: 0.6 }}>Skip for now</button>
            </div>
          )}

          {/* Step 4 — Height optional + finish */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Almost done!
              </h2>
              <div>
                <label className="label">Height (optional)</label>
                <input className="input-base" type="number" step="0.1" placeholder={unit === 'lbs' ? 'inches (e.g. 70)' : 'cm (e.g. 175)'} value={form.height} onChange={e => set('height', e.target.value)} />
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(45,212,191,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-text)' }}>Your setup summary</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {form.display_name} · {form.start_weight} → {form.goal_weight} {unit} · {parseInt(form.daily_step_goal).toLocaleString()} steps/day
                  {form.diet_type ? ` · ${form.diet_type === 'Other' && form.diet_custom ? form.diet_custom : form.diet_type}` : ''}
                </p>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(3)}>← Back</button>
                <button className="btn-primary flex-1" onClick={() => setStep(5)}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 5 — App tour + install */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Here's what's waiting for you
              </h2>
              <div className="space-y-3">
                {[
                  { icon: "📈", tab: "Progress", desc: "Log your weight and steps daily. See your trend line, streak, and how far you've come." },
                  { icon: "🎯", tab: "Goals", desc: "Set your goal weight and daily steps. Your private journal lives here too." },
                  { icon: "💬", tab: "Chat", desc: "Live community + 5 AI coaches. Type @coach to ask anything about fitness, nutrition, or mindset." },
                  { icon: "👤", tab: "Profile", desc: "Your public journey page. Share it. Let people follow your progress." },
                ].map(item => (
                  <div key={item.tab} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{item.tab}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>📱 Add Nuroni to your home screen</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>iPhone:</strong> Tap the Share button in Safari → "Add to Home Screen"<br />
                  <strong style={{ color: 'var(--text-secondary)' }}>Android:</strong> Tap the browser menu (⋮) → "Add to Home Screen"<br />
                  Works like a native app — no App Store needed.
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(4)}>← Back</button>
                <button className="btn-primary flex-1" onClick={save} disabled={saving}>{saving ? 'Saving…' : "Let's go →"}</button>
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
