'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PlusSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto redirect after 4 seconds
    const t = setTimeout(() => router.push('/progress'), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 max-w-sm w-full text-center animate-fade-in">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Welcome to Plus+
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Your subscription is active. All Plus+ features are now unlocked.
        </p>
        <Link href="/progress" className="btn-primary w-full" style={{ display: 'flex' }}>
          Go to my progress →
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Redirecting automatically…</p>
      </div>
    </div>
  )
}
