'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PlusPage() {
  const [loading, setLoading] = useState(false)
  const [isPlus, setIsPlus] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('is_plus').eq('id', user.id).maybeSingle()
        .then(({ data }) => { if (data?.is_plus) setIsPlus(true) })
    })
  }, [supabase, router])

  async function handleUpgrade() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  async function handlePortal() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  const features = [
    { icon: '📈', title: 'Trend line', desc: 'Smoothed weight average — ignore daily noise.' },
    { icon: '⏱️', title: 'Pace tracker', desc: 'See exactly when you\'ll hit your goal at current pace.' },
    { icon: '📝', title: 'Entry notes', desc: 'Add context to any log — "felt bloated", "ate clean".' },
    { icon: '📤', title: 'Data export', desc: 'Download your full history as a CSV anytime.' },
    { icon: '🎨', title: 'Progress share card', desc: 'Beautiful shareable image for socials.' },
    { icon: '💬', title: 'Fitness community', desc: 'Live chat with real people on real journeys.' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <div className="landing-glow-1" style={{
        position: 'fixed', top: '-120px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Image src="/logo.png" alt="Nuroni" width={120} height={80} style={{ objectFit: 'contain', height: '48px', width: 'auto' }} />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-3" style={{ background: 'var(--accent)', color: '#0D1117' }}>
            ✦ Plus+
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Level up your journey
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Everything free, plus tools that keep you moving.
          </p>
        </div>

        {/* Price card */}
        <div className="card p-5 text-center" style={{ border: '1.5px solid var(--accent)' }}>
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            $5
          </div>
          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>per month · cancel anytime</div>

          {isPlus ? (
            <div className="space-y-3">
              <div className="py-2 px-4 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                ✓ You're on Plus+
              </div>
              <button onClick={handlePortal} disabled={loading} className="btn-secondary w-full text-sm">
                {loading ? 'Loading…' : 'Manage subscription'}
              </button>
            </div>
          ) : (
            <button onClick={handleUpgrade} disabled={loading} className="btn-primary w-full">
              {loading ? 'Loading…' : 'Upgrade to Plus+ →'}
            </button>
          )}
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Secure payment via Stripe</p>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {features.map((f, i) => (
            <div key={i} className="card p-3.5 flex items-start gap-3">
              <div className="text-xl flex-shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{f.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Back */}
        <button onClick={() => router.push('/progress')} className="btn-secondary w-full text-sm">
          ← Back to progress
        </button>
      </div>
    </div>
  )
}
