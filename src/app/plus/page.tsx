'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PlusPage() {
  const [loading, setLoading] = useState(false)
  const [isPlus, setIsPlus] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('is_plus, trial_ends_at').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.is_plus) setIsPlus(true)
          if (data?.trial_ends_at) setTrialEndsAt(data.trial_ends_at)
        })
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

  function getTrialDaysLeft(): number | null {
    if (!trialEndsAt) return null
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86400000))
  }

  const trialDaysLeft = getTrialDaysLeft()
  const isTrialing = isPlus && trialDaysLeft !== null && trialDaysLeft >= 0

  const features = [
    { icon: '💬', title: 'Live fitness community', desc: 'Chat with real people on real journeys. 24/7.' },
    { icon: '🤖', title: '5 AI coaches', desc: 'Maya, Dex, Riley, Nova, Blaze — each a specialist. Ask anything.' },
    { icon: '📸', title: 'Proof of the Day', desc: 'Post your daily gym, walk, or meal photo. Get hearts from the community.' },
    { icon: '📓', title: 'Private journal', desc: 'Write entries with photos. Only you can see them. Ever.' },
    { icon: '🏆', title: 'Weekly leaderboard', desc: 'Compete on steps with other members. Opt-in, no pressure.' },
    { icon: '📈', title: 'Trend line + smoothing', desc: 'See your real weight trajectory, not daily noise.' },
    { icon: '⏱️', title: 'Pace tracker', desc: 'See exactly when you\'ll hit your goal at current pace.' },
    { icon: '📝', title: 'Entry notes', desc: 'Add context to any log — how you felt, what you ate.' },
    { icon: '📤', title: 'Data export', desc: 'Download your full history as a CSV anytime.' },
    { icon: '🎨', title: 'Progress share card', desc: 'Shareable image with your stats, streak, and AI distance fact.' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <div style={{
        position: 'fixed', top: '-120px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src="/logo.png" alt="Nuroni" style={{ height: '44px', width: 'auto', display: 'block', margin: '0 auto' }} />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-3 mt-3" style={{ background: 'var(--accent)', color: '#0D1117' }}>
            ✦ Plus+
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {isTrialing ? 'Your trial is active' : 'Level up your journey'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isTrialing
              ? `You have ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial.`
              : 'Try everything free for 7 days. Cancel anytime.'}
          </p>
        </div>

        {/* Price card */}
        <div className="card p-5 text-center" style={{ border: '1.5px solid var(--accent)' }}>
          {!isPlus && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--accent)' }}>
              🎉 7 days free — no charge until day 8
            </div>
          )}
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            $5
          </div>
          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>per month · cancel anytime</div>

          {isPlus ? (
            <div className="space-y-3">
              {isTrialing && trialDaysLeft !== null && (
                <div className="py-2 px-4 rounded-xl text-sm" style={{ background: 'rgba(45,212,191,0.08)', color: 'var(--accent-text)', border: '1px solid rgba(45,212,191,0.2)' }}>
                  ✦ Trial active · {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining
                </div>
              )}
              {!isTrialing && (
                <div className="py-2 px-4 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                  ✓ You're on Plus+
                </div>
              )}
              <button onClick={handlePortal} disabled={loading} className="btn-secondary w-full text-sm">
                {loading ? 'Loading…' : 'Manage subscription'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={handleUpgrade} disabled={loading} className="btn-primary w-full">
                {loading ? 'Loading…' : 'Start free trial →'}
              </button>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Card required · no charge for 7 days · cancel before day 8 to pay nothing</p>
            </div>
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
