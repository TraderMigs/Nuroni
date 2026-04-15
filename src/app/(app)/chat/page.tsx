'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  user_id: string
  content: string
  media_url?: string | null
  media_type?: string | null
  created_at: string
  display_name?: string
  username?: string
  weight_unit?: string
  start_weight?: number
  current_weight?: number
  is_admin?: boolean
  is_coach?: boolean
}

interface ProfileModal {
  user_id: string
  display_name: string
  username: string
  start_weight: number
  current_weight: number
  goal_weight: number | null
  weight_unit: string
  follower_count: number
}

const COACH_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
])

const BLOCKED_PATTERNS = [
  /instagram|facebook|tiktok|snapchat|twitter|youtube|linkedin|pinterest|threads|reddit|whatsapp|telegram|discord|twitch/i,
  /\big\b|\btt\b|\byt\b|\bfb\b|\bsc\b/i,
  /https?:\/\//i,
  /\b\w+\.(com|net|io|org|co|app|gg|tv|me|link|bio|xyz|info|us|uk|ca)\b/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /(\+?\d[\d\s\-().]{7,}\d)/,
  /dm me|message me|text me|hit me up|reach me|contact me|find me|follow me/i,
  /venmo|cashapp|paypal|zelle|cash app/i,
  /my program|my plan|my course|my coaching|my page|my channel/i,
]

function isBlocked(text: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(text))
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function MessageContent({ content, isAdmin, isMe }: { content: string; isAdmin: boolean; isMe: boolean }) {
  if (!isAdmin || !content) return <span>{content}</span>
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|www\.[^\s]+)/g
  const parts = content.split(urlRegex)
  return (
    <>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0
          const href = part.startsWith('http') ? part : part.includes('@') ? `mailto:${part}` : `https://${part}`
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? '#0D1117' : 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [blockedNotice, setBlockedNotice] = useState(false)
  const [isPlus, setIsPlus] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState('')
  const [profileCache, setProfileCache] = useState<Record<string, Partial<Message>>>({})
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [profileModal, setProfileModal] = useState<ProfileModal | null>(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [showTip, setShowTip] = useState(false)

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, weight_unit, start_weight, is_admin, is_coach')
      .in('id', userIds)

    const { data: entries } = await supabase
      .from('entries')
      .select('user_id, weight, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    const latestWeights: Record<string, number> = {}
    entries?.forEach(e => { if (!latestWeights[e.user_id]) latestWeights[e.user_id] = e.weight })

    const result: Record<string, Partial<Message>> = {}
    profiles?.forEach(p => {
      result[p.id] = {
        display_name: p.display_name,
        username: p.username,
        weight_unit: p.weight_unit,
        start_weight: p.start_weight,
        current_weight: latestWeights[p.id],
        is_admin: p.is_admin,
        is_coach: p.is_coach,
      }
    })
    return result
  }, [supabase])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('is_plus, is_admin').eq('id', user.id).maybeSingle()

      if (!profile?.is_plus) { setIsPlus(false); return }
      setIsPlus(true)
      setIsAdmin(profile?.is_admin || false)

      const tipSeen = localStorage.getItem('nuroni-chat-tip')
      if (!tipSeen) setShowTip(true)

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      setFollowedIds(new Set(Array.from(follows?.map(f => f.following_id) || [])))

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50)

      const initialMsgs = msgs || []
      setMessages(initialMsgs)

      if (initialMsgs.length > 0) {
        const ids = Array.from(new Set(initialMsgs.map(m => m.user_id)))
        fetchProfiles(ids).then(cache => {
          setProfileCache(cache)
          setMessages(prev => prev.map(m => ({ ...m, ...cache[m.user_id] })))
        })
      }

      const channel = supabase
        .channel('fitness-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setProfileCache(cache => {
            if (cache[newMsg.user_id]) {
              setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...cache[newMsg.user_id] } : m))
              return cache
            }
            fetchProfiles([newMsg.user_id]).then(newCache => {
              const merged = { ...cache, ...newCache }
              setProfileCache(merged)
              setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...merged[m.user_id] } : m))
            })
            return cache
          })
        })
        .subscribe()

      cleanup = () => { channel.unsubscribe() }
    }

    init()
    return () => { cleanup?.() }
  }, [supabase, router, fetchProfiles])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (showTip) {
      const t = setTimeout(dismissTip, 6000)
      return () => clearTimeout(t)
    }
  }, [showTip])

  async function openProfile(msg: Message) {
    if (!msg.username || msg.is_coach || COACH_IDS.has(msg.user_id)) return
    const { data: goal } = await supabase
      .from('goals')
      .select('goal_weight')
      .eq('user_id', msg.user_id)
      .maybeSingle()
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', msg.user_id)
    setProfileModal({
      user_id: msg.user_id,
      display_name: msg.display_name || msg.username || 'Member',
      username: msg.username,
      start_weight: msg.start_weight || 0,
      current_weight: msg.current_weight || msg.start_weight || 0,
      goal_weight: goal?.goal_weight || null,
      weight_unit: msg.weight_unit || 'lbs',
      follower_count: count || 0,
    })
  }

  async function toggleFollow(targetId: string) {
    if (!userId || userId === targetId) return
    setFollowLoading(true)
    if (followedIds.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId)
      setFollowedIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
      if (profileModal) setProfileModal({ ...profileModal, follower_count: Math.max(0, profileModal.follower_count - 1) })
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: targetId })
      setFollowedIds(prev => new Set(Array.from(prev).concat(targetId)))
      if (profileModal) setProfileModal({ ...profileModal, follower_count: profileModal.follower_count + 1 })
    }
    setFollowLoading(false)
  }

  function dismissTip() {
    setShowTip(false)
    localStorage.setItem('nuroni-chat-tip', '1')
  }

  async function sendMessage(mediaUrl?: string, mediaType?: string) {
    const text = input.trim()
    if (!text && !mediaUrl) return
    if (sending) return
    if (!isAdmin && text && isBlocked(text)) {
      setBlockedNotice(true)
      setTimeout(() => setBlockedNotice(false), 3000)
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimistic: Message = { id: tempId, user_id: userId, content: text, media_url: mediaUrl || null, media_type: mediaType || null, created_at: new Date().toISOString(), ...profileCache[userId] }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    inputRef.current?.focus()

    setSending(true)
    const { data, error } = await supabase.from('messages').insert({ user_id: userId, content: text, media_url: mediaUrl || null, media_type: mediaType || null }).select().maybeSingle()
    setSending(false)

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      if (!mediaUrl) setInput(text)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, ...profileCache[userId] } : m))
      if (text) {
        fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, user_id: userId }),
        }).catch(() => {})
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      const tempId = `temp-${Date.now()}`
      const optimistic: Message = { id: tempId, user_id: userId, content: '', media_url: data.url, media_type: data.mediaType, created_at: new Date().toISOString(), ...profileCache[userId] }
      setMessages(prev => [...prev, optimistic])
      const { data: msgData, error } = await supabase.from('messages').insert({ user_id: userId, content: '', media_url: data.url, media_type: data.mediaType }).select().maybeSingle()
      if (!error && msgData) setMessages(prev => prev.map(m => m.id === tempId ? { ...msgData, ...profileCache[userId] } : m))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isPlus === false) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-4xl mb-4">💬</div>
      <h2 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Fitness Chat</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>Real conversations with real people on real journeys. Plus+ exclusive.</p>
      <button onClick={() => router.push('/plus')} className="btn-primary">Upgrade to Plus+</button>
    </div>
  )

  if (isPlus === null) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-w-lg mx-auto w-full overflow-x-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div>
          <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Fitness Chat</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Plus+ members · fitness topics only</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117' }}>Live</span>
      </div>

      {showTip && (
        <div
          className="mx-4 mt-2 px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in"
          style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(45,212,191,0.3)' }}
        >
          <p className="text-xs" style={{ color: 'var(--accent-text)', lineHeight: 1.5 }}>
            Tap any name to check their stats and follow their journey.
          </p>
          <button onClick={dismissTip} style={{ color: 'var(--accent-text)', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">👋</div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Be the first to say something!</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ask about workouts, meal plans, progress — anything fitness.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user_id === userId
          const isCoach = msg.is_coach || COACH_IDS.has(msg.user_id)
          const isFollowed = followedIds.has(msg.user_id)
          const showName = !isMe && (i === 0 || messages[i - 1].user_id !== msg.user_id)
          const lostSoFar = msg.start_weight && msg.current_weight ? parseFloat((msg.start_weight - msg.current_weight).toFixed(1)) : null

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && (
                <button
                  className="flex items-center gap-1.5 mb-1 ml-1 flex-wrap"
                  onClick={() => openProfile(msg)}
                  style={{ background: 'none', border: 'none', cursor: isCoach ? 'default' : 'pointer', padding: 0 }}
                >
                  <span className="text-xs font-semibold" style={{ color: isCoach ? '#a78bfa' : isFollowed ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {msg.display_name || msg.username || 'Member'}
                  </span>
                  {isCoach && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontSize: '9px', border: '1px solid rgba(167,139,250,0.3)' }}>
                      AI COACH
                    </span>
                  )}
                  {!isCoach && isFollowed && <span className="ml-1">⭐</span>}
                  {!isCoach && msg.is_admin && (
                    <span className="ml-1 text-xs px-1 rounded" style={{ background: 'var(--accent)', color: '#0D1117', fontSize: '9px' }}>ADMIN</span>
                  )}
                  {!isCoach && lostSoFar !== null && lostSoFar > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                      -{lostSoFar} {msg.weight_unit || 'lbs'}
                    </span>
                  )}
                </button>
              )}

              {msg.media_url && (
                <div className="max-w-[80%] mb-1">
                  <img src={msg.media_url} alt="shared media" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 12, display: 'block' }} />
                </div>
              )}

              {msg.content && (
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                  style={{
                    background: isMe
                      ? 'var(--accent)'
                      : isCoach
                      ? 'rgba(167,139,250,0.08)'
                      : isFollowed
                      ? 'rgba(45,212,191,0.08)'
                      : 'var(--bg-card)',
                    color: isMe ? '#0D1117' : 'var(--text-primary)',
                    border: isMe
                      ? 'none'
                      : isCoach
                      ? '1px solid rgba(167,139,250,0.25)'
                      : isFollowed
                      ? '1px solid rgba(45,212,191,0.3)'
                      : '1px solid var(--border)',
                    borderBottomRightRadius: isMe ? 4 : undefined,
                    borderBottomLeftRadius: !isMe ? 4 : undefined,
                    opacity: msg.id.startsWith('temp-') ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                    wordBreak: 'break-word',
                  }}
                >
                  <MessageContent content={msg.content} isAdmin={!!(msg.is_admin || isMe)} isMe={isMe} />
                </div>
              )}
              <span className="text-xs mt-0.5 mx-1" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.created_at)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setProfileModal(null)}>
          <div className="card w-full max-w-sm p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {profileModal.display_name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  @{profileModal.username} · {profileModal.follower_count} follower{profileModal.follower_count !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => toggleFollow(profileModal.user_id)}
                disabled={followLoading || profileModal.user_id === userId}
                className={followedIds.has(profileModal.user_id) ? 'btn-secondary py-2 px-3 text-sm gap-1.5' : 'btn-primary py-2 px-3 text-sm gap-1.5'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={followedIds.has(profileModal.user_id) ? 'var(--accent)' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {followedIds.has(profileModal.user_id) ? 'Following' : 'Follow'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card text-center p-3">
                <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profileModal.current_weight}</div>
                <div className="stat-label">{profileModal.weight_unit} now</div>
              </div>
              <div className="stat-card text-center p-3">
                <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                  {profileModal.start_weight - profileModal.current_weight > 0 ? `-${parseFloat((profileModal.start_weight - profileModal.current_weight).toFixed(1))}` : '0'}
                </div>
                <div className="stat-label">lost</div>
              </div>
              <div className="stat-card text-center p-3">
                <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profileModal.goal_weight || '-'}</div>
                <div className="stat-label">goal</div>
              </div>
            </div>

            <a href={`/u/${profileModal.username}`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-sm" style={{ display: 'flex', textDecoration: 'none' }}>
              View full profile
            </a>
          </div>
        </div>
      )}

      {blockedNotice && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
          Keep it in-app — links, socials, and contact info are not allowed here.
        </div>
      )}

      {uploading && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
          Uploading...
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-shrink-0 p-2.5 rounded-xl" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
            </>
          )}
          <input
            ref={inputRef}
            className="input-base flex-1"
            placeholder={isAdmin ? 'Send anything...' : 'Ask about workouts, meals, progress...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            maxLength={isAdmin ? 2000 : 500}
          />
          <button onClick={() => sendMessage()} disabled={sending || !input.trim()} className="btn-primary py-3 px-4 flex-shrink-0" style={{ borderRadius: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        {!isAdmin && <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Fitness topics only · No links, socials, or self-promotion</p>}
      </div>
    </div>
  )
}
