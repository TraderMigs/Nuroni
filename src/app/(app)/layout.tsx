'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('nuroni-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored === 'dark' || (!stored && prefersDark)
    setDark(isDark)
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])
  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('nuroni-theme', next ? 'dark' : 'light')
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }
  return (
    <button onClick={toggle} className="nav-item" aria-label="Toggle theme">
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isPlus, setIsPlus] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('is_plus, is_admin').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.is_plus) setIsPlus(true)
          if (data?.is_admin) setIsAdmin(true)
        })
    })
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      href: '/progress',
      label: 'Progress',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
    {
      href: '/goals',
      label: 'Goals',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
      ),
    },
    {
      href: '/chat',
      label: 'Chat',
      plusOnly: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <img
          src="/logo.png"
          alt="Nuroni"
          style={{ height: '44px', width: 'auto', maxWidth: '180px', display: 'block' }}
        />
        <div className="flex items-center gap-1">
          {!isPlus && (
            <button
              onClick={() => router.push('/plus')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#0D1117' }}
            >
              ✦ Plus+
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: pathname === '/admin' ? 600 : 400,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Admin
            </button>
          )}
          <ThemeToggle />
          <button onClick={handleLogout} className="nav-item" aria-label="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 page-enter w-full overflow-x-hidden">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center sm:justify-center px-2 py-2 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {navItems.map(item => (
          <button
            key={item.href}
            className={`nav-item relative ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.plusOnly && !isPlus && (
              <span className="absolute -top-1 -right-1 text-xs w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117', fontSize: '7px' }}>
                +
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
