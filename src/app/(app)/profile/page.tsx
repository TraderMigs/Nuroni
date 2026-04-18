'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DIET_OPTIONS = [
  'Standard', 'Vegetarian', 'Vegan', 'Pescatarian',
  'Keto', 'Ketovore', 'Carnivore', 'Mediterranean',
  'Paleo', 'Intermittent Fasting', 'Gluten-Free', 'Dairy-Free', 'Other',
]

const CATEGORY_COLORS: Record<string, string> = {
  Gym: '#2dd4bf',
  Walk: '#60a5fa',
  Meal: '#f59e0b',
  Other: '#a78bfa',
}

interface ProofPhoto {
  id: string
  photo_url: string
  category: string
  created_at: string
  is_public: boolean
}

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [proofPhotosPublic, setProofPhotosPublic] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [referralToast, setReferralToast] = useState('')
  const [referralEnabled, setReferralEnabled] = useState(false)

  // Proof photos state
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>([])
  const [proofExpanded, setProofExpanded] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<ProofPhoto | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

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
      setIsAdmin(p.is_admin || false)
      setProofPhotosPublic(p.proof_photos_public ?? true)
      setReferralCode(p.referral_code || '')
      // Load app settings for referral visibility
      const { data: appSettings } = await supabase.from('app_settings').select('referral_enabled').eq('id', 1).maybeSingle()
      setReferralEnabled(appSettings?.referral_enabled || false)
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

      // Load proof photos
      const { data: photos } = await supabase
        .from('proof_photos')
        .select('id, photo_url, category, created_at, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setProofPhotos(photos || [])
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function copyReferral() {
    const link = `${window.location.origin}/signup?ref=${referralCode}`
    await navigator.clipboard.writeText(link)
    setReferralToast('Referral link copied!')
    setTimeout(() => setReferralToast(''), 2500)
  }

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

  async function deleteProofPhoto(photoId: string) {
    setDeletingPhotoId(photoId)
    const { error } = await supabase.from('proof_photos').delete().eq('id', photoId)
    if (!error) {
      setProofPhotos(prev => prev.filter(p => p.id !== photoId))
      setFullscreenPhoto(null)
      setToast('Photo deleted')
    }
    setDeletingPhotoId(null)
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
          {!isAdmin && (
            <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary py-1.5 px-3 text-xs">
              {portalLoading ? '…' : 'Manage'}
            </button>
          )}
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

      {referralCode && referralEnabled && (
        <div className="card p-4 mb-4" style={{ border: '1px solid rgba(45,212,191,0.2)', background: 'rgba(45,212,191,0.03)' }}>
          {referralToast && <div className="toast mb-2">{referralToast}</div>}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>🎁 Give a friend a free month</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Share your link — when they subscribe, you earn a free month too.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl text-xs truncate" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              nuroni.app/signup?ref={referralCode}
            </div>
            <button onClick={copyReferral} className="btn-primary py-2 px-3 text-xs flex-shrink-0">Copy</button>
          </div>
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium select-none" style={{ color: 'var(--text-muted)', lineHeight: 1 }}>@</span>
            <input className="input-base" style={{ paddingLeft: '1.75rem' }} placeholder="alexfit" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))} />
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

      {/* Proof of the Day — owner grid */}
      {isPlus && (
        <div className="card p-4 mt-4">
          <button
            onClick={() => setProofExpanded(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', padding: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Proof of the Day
                </h2>
                {proofPhotos.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                    {proofPhotos.length}
                  </span>
                )}
                {!proofPhotosPublic && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
                    Private
                  </span>
                )}
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--text-muted)', transform: proofExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {proofExpanded && (
            <div className="mt-3 animate-fade-in">
              {proofPhotos.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No proof yet — start posting in chat!
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {proofPhotos.map(photo => (
                    <div
                      key={photo.id}
                      className="relative cursor-pointer"
                      style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}
                      onClick={() => setFullscreenPhoto(photo)}
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.category}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ position: 'absolute', bottom: 4, left: 4 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: 4,
                            background: `${CATEGORY_COLORS[photo.category] || '#888'}cc`,
                            color: '#fff',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {photo.category}
                        </span>
                      </div>
                      {!proofPhotosPublic && (
                        <div style={{ position: 'absolute', top: 4, right: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* Fullscreen photo viewer with delete */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            onClick={() => setFullscreenPhoto(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img
              src={fullscreenPhoto.photo_url}
              alt="Proof"
              style={{ maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 12 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: `${CATEGORY_COLORS[fullscreenPhoto.category] || '#888'}33`,
                  color: CATEGORY_COLORS[fullscreenPhoto.category] || '#888',
                  border: `1px solid ${CATEGORY_COLORS[fullscreenPhoto.category] || '#888'}55`,
                }}
              >
                {fullscreenPhoto.category}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {new Date(fullscreenPhoto.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => deleteProofPhoto(fullscreenPhoto.id)}
              disabled={deletingPhotoId === fullscreenPhoto.id}
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: deletingPhotoId === fullscreenPhoto.id ? 0.5 : 1,
              }}
            >
              {deletingPhotoId === fullscreenPhoto.id ? 'Deleting…' : 'Delete photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
