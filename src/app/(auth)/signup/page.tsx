'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
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
          <input
            type="password"
            className="input-base"
            placeholder="At least 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()}
          />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleSignup}
          disabled={loading || !email || !password}
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
