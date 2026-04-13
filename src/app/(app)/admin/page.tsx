'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: string
  email: string
  display_name: string
  username: string
  is_plus: boolean
  is_admin: boolean
  created_at: string
  stripe_subscription_id: string | null
}

interface Stats {
  totalUsers: number
  plusUsers: number
  totalMessages: number
  totalEntries: number
  mrr: number
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'overview' | 'users' | 'chat'>('overview')
  const [recentMessages, setRecentMessages] = useState<{id: string; content: string; display_name: string; created_at: string}[]>([])
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_admin) { setAuthorized(false); return }
    setAuthorized(true)

    // Load all users
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email, display_name, username, is_plus, is_admin, created_at, stripe_subscription_id')
      .order('created_at', { ascending: false })

    // Load stats
    const [
      { count: totalUsers },
      { count: plusUsers },
      { count: totalMessages },
      { count: totalEntries },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_plus', true),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('entries').select('*', { count: 'exact', head: true }),
    ])

    // Load recent messages with display names
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(30)

    if (msgs && msgs.length > 0) {
      const userIds = Array.from(new Set(msgs.map(m => m.user_id)))
      const { data: msgProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', userIds)
      const profileMap: Record<string, string> = {}
      msgProfiles?.forEach(p => { profileMap[p.id] = p.display_name || p.username || 'Unknown' })
      setRecentMessages(msgs.map(m => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        display_name: profileMap[m.user_id] || 'Unknown',
      })))
    }

    setUsers(allUsers || [])
    setStats({
      totalUsers: totalUsers || 0,
      plusUsers: plusUsers || 0,
      totalMessages: totalMessages || 0,
      totalEntries: totalEntries || 0,
      mrr: (plusUsers || 0) * 5,
    })
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function togglePlus(userId: string, current: boolean) {
    const res = await fetch('/api/admin/toggle-plus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: userId, is_plus: !current }),
    })
    const data = await res.json()
    if (data.ok) {
      setToast(`Plus+ ${!current ? 'enabled' : 'removed'}`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_plus: !current } : u))
      if (stats) setStats({ ...stats, plusUsers: stats.plusUsers + (!current ? 1 : -1), mrr: (stats.plusUsers + (!current ? 1 : -1)) * 5 })
    } else {
      setToast('Error: ' + (data.error || 'Failed'))
    }
  }

  async function deleteMessage(msgId: string) {
    setDeletingMsg(msgId)
    const { error } = await supabase.from('messages').delete().eq('id', msgId)
    if (!error) {
      setRecentMessages(prev => prev.filter(m => m.id !== msgId))
      setToast('Message deleted')
    }
    setDeletingMsg(null)
  }

  async function deleteUser(userId: string) {
    if (!confirm('Delete this user and all their data? This cannot be undone.')) return
    await supabase.from('entries').delete().eq('user_id', userId)
    await supabase.from('goals').delete().eq('user_id', userId)
    await supabase.from('messages').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setToast('User deleted')
  }

  if (authorized === null || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (authorized === false) return (
    <div className="flex items-center justify-center min-h-screen">
      <p style={{ color: 'var(--text-muted)' }}>Access denied.</p>
    </div>
  )

  const filtered = users.filter(u =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 overflow-x-hidden">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold mb-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Admin
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nuroni control panel</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['overview', 'users', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-2 text-sm font-medium capitalize transition-colors"
            style={{
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.plusUsers}</div>
              <div className="stat-label">Plus+ users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--success)' }}>${stats.mrr}</div>
              <div className="stat-label">MRR (est.)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Total entries</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalMessages}</div>
            <div className="stat-label">Chat messages</div>
          </div>

          {/* Recent signups */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Recent signups
            </h2>
            <div className="space-y-2">
              {users.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0">
                    <span className="font-medium truncate block" style={{ color: 'var(--text-primary)' }}>{u.display_name || u.email}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                  {u.is_plus && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'var(--accent)', color: '#0D1117' }}>Plus+</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-3">
          <input
            className="input-base"
            placeholder="Search by name, email, or username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="card p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {u.display_name || '(no name)'}
                      </span>
                      {u.is_plus && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117' }}>Plus+</span>}
                      {u.is_admin && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Admin</span>}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                    {u.username && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => togglePlus(u.id, u.is_plus)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                    style={{
                      background: u.is_plus ? 'rgba(239,68,68,0.1)' : 'var(--accent-subtle)',
                      color: u.is_plus ? 'var(--danger)' : 'var(--accent-text)',
                    }}
                  >
                    {u.is_plus ? 'Remove Plus+' : 'Grant Plus+'}
                  </button>
                  {!u.is_admin && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                      style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}
                    >
                      Delete user
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 30 messages — tap to delete</p>
          {recentMessages.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
          )}
          {recentMessages.map(msg => (
            <div key={msg.id} className="card p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{msg.display_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{msg.content}</p>
              </div>
              <button
                onClick={() => deleteMessage(msg.id)}
                disabled={deletingMsg === msg.id}
                className="flex-shrink-0 p-1.5 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
