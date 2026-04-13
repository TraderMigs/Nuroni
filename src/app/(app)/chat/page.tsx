'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  display_name?: string
  username?: string
  weight_unit?: string
  start_weight?: number
  current_weight?: number
  is_plus?: boolean
}

// Filter rules — silent block
const BLOCKED_PATTERNS = [
  // Social platforms
  /instagram|facebook|tiktok|snapchat|twitter|youtube|linkedin|pinterest|threads|reddit|whatsapp|telegram|discord|twitch/i,
  // Abbreviated socials
  /\big\b|\btt\b|\byt\b|\bfb\b|\bsc\b/i,
  // URLs — any domain pattern
  /https?:\/\//i,
  /\b\w+\.(com|net|io|org|co|app|gg|tv|me|link|bio|xyz|info|us|uk|ca)\b/i,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // Phone numbers
  /(\+?\d[\d\s\-().]{7,}\d)/,
  // Redirect phrases
  /dm me|message me|text me|hit me up|reach me|contact me|find me|follow me/i,
  // Payment platforms
  /venmo|cashapp|paypal|zelle|cash app/i,
  // Self-promo patterns
  /my program|my plan|my course|my coaching|my page|my profile|my channel/i,
]

function isBlocked(text: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(text))
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function UserBadge({ msg }: { msg: Message }) {
  const lostSoFar = msg.start_weight && msg.current_weight
    ? parseFloat((msg.start_weight - msg.current_weight).toFixed(1))
    : null
  const unit = msg.weight_unit || 'lbs'
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        {msg.display_name || msg.username || 'Member'}
      </span>
      {lostSoFar !== null && lostSoFar > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
          −{lostSoFar} {unit}
        </span>
      )}
    </div>
  )
}

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [blockedNotice, setBlockedNotice] = useState(false)
  const [isPlus, setIsPlus] = useState<boolean | null>(null)
  const [userId, setUserId] = useState('')
  const [profileCache, setProfileCache] = useState<Record<string, Partial<Message>>>({})

  const enrichMessages = useCallback(async (msgs: Message[], cache: Record<string, Partial<Message>>) => {
    const unknownIds = [...new Set(msgs.map(m => m.user_id))].filter(id => !cache[id])
    if (unknownIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, weight_unit, start_weight')
        .in('id', unknownIds)

      const { data: entries } = await supabase
        .from('entries')
        .select('user_id, weight, created_at')
        .in('user_id', unknownIds)
        .order('created_at', { ascending: false })

      const latestWeights: Record<string, number> = {}
      entries?.forEach(e => {
        if (!latestWeights[e.user_id]) latestWeights[e.user_id] = e.weight
      })

      const newCache = { ...cache }
      profiles?.forEach(p => {
        newCache[p.id] = {
          display_name: p.display_name,
          username: p.username,
          weight_unit: p.weight_unit,
          start_weight: p.start_weight,
          current_weight: latestWeights[p.id],
        }
      })
      setProfileCache(newCache)
      return newCache
    }
    return cache
  }, [supabase])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_plus')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.is_plus) { setIsPlus(false); return }
      setIsPlus(true)

      // Load last 50 messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50)

      if (!mounted) return
      const enriched = await enrichMessages(msgs || [], {})
      setMessages((msgs || []).map(m => ({ ...m, ...enriched[m.user_id] })))

      // Subscribe to realtime
      const channel = supabase
        .channel('fitness-chat')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, async (payload) => {
          if (!mounted) return
          const newMsg = payload.new as Message
          setProfileCache(cache => {
            enrichMessages([newMsg], cache).then(updatedCache => {
              setMessages(prev => [...prev, { ...newMsg, ...updatedCache[newMsg.user_id] }])
            })
            return cache
          })
        })
        .subscribe()

      return () => { channel.unsubscribe() }
    }

    init()
    return () => { mounted = false }
  }, [supabase, router, enrichMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    if (isBlocked(text)) {
      setBlockedNotice(true)
      setTimeout(() => setBlockedNotice(false), 3000)
      return
    }

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      user_id: userId,
      content: text,
    })
    if (!error) setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  // Not Plus — show gate
  if (isPlus === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h2 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Fitness Chat
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>
          Real conversations with real people on real journeys. Plus+ exclusive.
        </p>
        <button onClick={() => router.push('/plus')} className="btn-primary">
          Upgrade to Plus+ →
        </button>
      </div>
    )
  }

  // Loading
  if (isPlus === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-w-lg mx-auto w-full overflow-x-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div>
          <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Fitness Chat
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Plus+ members · fitness topics only</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117' }}>
          ✦ Live
        </span>
      </div>

      {/* Messages */}
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
          const showName = i === 0 || messages[i - 1].user_id !== msg.user_id

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && !isMe && (
                <div className="mb-1 ml-1">
                  <UserBadge msg={msg} />
                </div>
              )}
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                style={{
                  background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                  color: isMe ? '#0D1117' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: !isMe ? 4 : undefined,
                }}
              >
                {msg.content}
              </div>
              <span className="text-xs mt-0.5 mx-1" style={{ color: 'var(--text-muted)' }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Blocked notice */}
      {blockedNotice && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
          Keep it in-app — links, socials, and contact info aren&apos;t allowed here.
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="input-base flex-1"
            placeholder="Ask about workouts, meals, progress…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="btn-primary py-3 px-4 flex-shrink-0"
            style={{ borderRadius: 10 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
          Fitness topics only · No links, socials, or self-promotion
        </p>
      </div>
    </div>
  )
}
