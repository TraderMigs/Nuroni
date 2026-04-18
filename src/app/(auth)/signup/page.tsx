'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function SignupInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('nuroni-referral-code', ref)
  }, [searchParams])

  async function handleSignup() {
    if (!agreed) { setError('Please confirm you are 18+ and agree to our Terms and Privacy Policy.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Track referral if a ref code was stored
      const refCode = localStorage.getItem('nuroni-referral-code')
      if (refCode) {
        try {
          // Get the new user ID
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await fetch('/api/referral/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referral_code: refCode, new_user_id: user.id }),
            })
            localStorage.removeItem('nuroni-referral-code')
          }
        } catch {}
      }
      window.location.href = '/onboarding'
    }
  }

  if (done) {
    return (
      <div className="card p-6 animate-fade-in text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-subtle)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Check your email
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>We sent a confirmation link to:</p>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{email}</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Click the link in that email to activate your account and start your journey.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Didn&apos;t get it? Check your spam folder or{' '}
          <button onClick={() => setDone(false)} className="underline" style={{ color: 'var(--accent-text)' }}>try again</button>.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6 animate-fade-in">
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Start your journey
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Create your free Nuroni account
      </p>

      <div className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input-base"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-base pr-10"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 18+ + TOS checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-colors"
              style={{
                background: agreed ? 'var(--accent)' : 'var(--bg-input)',
                border: `2px solid ${agreed ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {agreed && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#0D1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            I confirm I am 18 years of age or older and agree to the{' '}
            <Link href="/terms" target="_blank" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Privacy Policy</Link>
          </span>
        </label>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleSignup}
          disabled={loading || !email || !password || !agreed}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent-text)' }} className="font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  )
}
