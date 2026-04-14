'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [userId, setUserId] = useState('')
  const [isPlus, setIsPlus] = useState(false)

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    height: '',
    weight_unit: 'lbs',
    distance_unit: 'miles',
    start_weight: '',
    is_public: true,
    diet_type: '',
    diet_custom: '',
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (p) {
      setIsPlus(p.is_plus || false)
      setForm({
        display_name: p.display_name || '',
        username: p.username || '',
        height: p.height ? String(p.height) : '',
        weight_unit: p.weight_unit || 'lbs',
        distance_unit: p.distance_unit || 'miles',
        start_weight: p.start_weight ? String(p.start_weight) : '',
        is_public: p.is_public ?? true,
        diet_type: p.diet_type || '',
        diet_custom: p.diet_custom || '',
      })
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: form.display_name,
      username: form.username.toLowerCase(),
      height: form.height ? parseFloat(form.height) : null,
      weight_unit: form.weight_unit,
      distance_unit: form.distance_unit,
      start_weight: parseFloat(form.start_weight),
      is_public: form.is_public,
      diet_type: form.diet_type || null,
      diet_custom: form.diet_type === 'Other' ? form.diet_custom : null,
    })
    setSaving(false)
    if (!error) setToast('Profile saved ✓')
  }

  async function handlePortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPortalLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${form.username}`)
    setToast('Link copied!')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 overflow-x-hidden">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Profile</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your identity and setup</p>
      </div>

      {/* Subscription status */}
      {isPlus ? (
        <div className="card p-4 mb-4 flex items-center justify-between" style={{ border: '1.5px solid var(--accent)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>✦ Plus+ Active</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All features unlocked</p>
          </div>
          <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary py-1.5 px-3 text-xs">
            {portalLoading ? '…' : 'Manage'}
          </button>
        </div>
      ) : (
        <button onClick={() => router.push('/plus')} className="card p-4 mb-4 w-full text-left flex items-center justify-between" style={{ cursor: 'pointer', border: '1px dashed var(--border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Upgrade to Plus+</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>$5/month · cancel anytime</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--accent)', color: '#0D1117' }}>✦</span>
        </button>
      )}

      {/* Public link */}
      {form.username && (
        <div className="card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Your public link</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>nuroni.app/u/{form.username}</p>
          </div>
          <button onClick={copyLink} className="btn-secondary py-1.5 px-3 text-xs">Copy</button>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Display name</label>
          <input className="input-base" placeholder="Alex" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
            <input className="input-base pl-7" placeholder="alexfit" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Weight unit</label>
            <select className="input-base" value={form.weight_unit} onChange={e => setForm(f => ({ ...f, weight_unit: e.target.value }))}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div>
            <label className="label">Distance unit</label>
            <select className="input-base" value={form.distance_unit} onChange={e => setForm(f => ({ ...f, distance_unit: e.target.value }))}>
              <option value="miles">miles</option>
              <option value="km">km</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Height ({form.weight_unit === 'lbs' ? 'inches' : 'cm'}) <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <input className="input-base" type="number" step="0.1" placeholder={form.weight_unit === 'lbs' ? '68' : '173'} value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
        </div>
        <div>
          <label className="label">Starting weight ({form.weight_unit})</label>
          <input className="input-base" type="number" step="0.1" placeholder="185" value={form.start_weight} onChange={e => setForm(f => ({ ...f, start_weight: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Changing this recalculates your total progress.</p>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Public profile</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Anyone with your link can see your progress</p>
          </div>
          <button onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: form.is_public ? 'var(--accent)' : 'var(--border)' }}>
            <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: form.is_public ? 'translateX(24px)' : 'translateX(4px)' }} />
          </button>
        </div>
        {/* Diet type */}
        <div>
          <label className="label">Diet type <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DIET_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setForm(f => ({ ...f, diet_type: f.diet_type === d ? '' : d }))}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
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
            <input className="input-base mt-2" placeholder="Describe (max 20 chars)" maxLength={20} value={form.diet_custom} onChange={e => setForm(f => ({ ...f, diet_custom: e.target.value }))} />
          )}
        </div>

        <button className="btn-primary w-full" onClick={save} disabled={saving || !form.display_name || !form.username}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <Link
        href="/settings"
        className="card p-4 mt-4 flex items-center justify-between"
        style={{ textDecoration: 'none', display: 'flex' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Account settings</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Legal, support, delete account</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </Link>
    </div>
  )
}
