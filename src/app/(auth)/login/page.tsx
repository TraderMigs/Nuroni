'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/progress')
      router.refresh()
    }
  }

  return (
    <div className="card p-6 animate-fade-in">
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Welcome back
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Sign in to your journey
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
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input-base"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary w-full"
          onClick={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
        New here?{' '}
        <Link href="/signup" style={{ color: 'var(--accent-text)' }} className="font-medium hover:underline">
          Start your journey
        </Link>
      </p>
    </div>
  )
}
