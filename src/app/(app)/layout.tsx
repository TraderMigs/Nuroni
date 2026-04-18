'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
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

// PWA Install Banner
function PWAInstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if already dismissed
    if (localStorage.getItem('nuroni-pwa-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions banner after 3 seconds
      setTimeout(() => setShow(true), 3000)
    } else {
      // Listen for Chrome/Android install prompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as Event & { prompt: () => void })
        setTimeout(() => setShow(true), 3000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem('nuroni-pwa-dismissed', '1')
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      setShow(false)
      localStorage.setItem('nuroni-pwa-dismissed', '1')
    }
  }

  if (!show) return null

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 animate-fade-in"
      style={{ background: 'rgba(45,212,191,0.08)', borderBottom: '1px solid rgba(45,212,191,0.2)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm flex-shrink-0">📱</span>
        <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {isIOS
            ? <>Tap <strong style={{ color: 'var(--accent)' }}>Share</strong> → <strong style={{ color: 'var(--accent)' }}>Add to Home Screen</strong> to install Nuroni</>
            : <>Add <strong style={{ color: 'var(--accent)' }}>Nuroni</strong> to your home screen for the full app experience</>
          }
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            onClick={install}
            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--accent)', color: '#0D1117', border: 'none', cursor: 'pointer' }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
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
    <div className="flex flex-col overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }}>
      {/* Header — always visible, never scrolls away */}
      <header className="flex-shrink-0 z-40 flex items-center justify-between px-4 py-2 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <img
          src="/logo.png"
          alt="Nuroni"
          style={{ height: '44px', width: 'auto', maxWidth: '180px', display: 'block' }}
        />
        <div className="flex items-center gap-1">
          {!isPlus && (
            <Link
              href="/plus"
              prefetch
              className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#0D1117', textDecoration: 'none' }}
            >
              Plus+
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              prefetch
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: pathname === '/admin' ? 600 : 400,
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              Admin
            </Link>
          )}
          <ThemeToggle />
          <button onClick={handleLogout} className="nav-item" aria-label="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <PWAInstallBanner />

      {/* Scrollable content area */}
      <main className={`flex-1 overflow-x-hidden page-enter w-full ${pathname === '/chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-6'}`}>
        {children}
      </main>

      {/* Bottom nav — always visible */}
      <nav className="flex-shrink-0 z-40 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-evenly mx-auto py-2" style={{ maxWidth: '480px' }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`nav-item relative ${pathname === item.href ? 'active' : ''}`}
              style={{ textDecoration: 'none', minWidth: '60px' }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.plusOnly && !isPlus && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117', fontSize: '7px' }}>
                  +
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
