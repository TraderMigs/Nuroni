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
  quick_replies?: string[] | null
  payload?: { photo_id?: string; category?: string } | null
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

interface HeartState {
  [photoId: string]: { count: number; hearted: boolean }
}

const COACH_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
])

const COACH_SPECIALTIES: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'Fat Loss & Steps',
  '00000000-0000-0000-0000-000000000002': 'Strength & Lifting',
  '00000000-0000-0000-0000-000000000003': 'Cardio & Conditioning',
  '00000000-0000-0000-0000-000000000004': 'Nutrition & Diet',
  '00000000-0000-0000-0000-000000000005': 'Mindset & Motivation',
}

const CATEGORY_COLORS: Record<string, string> = {
  Gym: '#2dd4bf',
  Walk: '#60a5fa',
  Meal: '#f59e0b',
  Other: '#a78bfa',
}

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

// Extract category from message — payload first, fallback to content prefix
function extractProofCategory(msg: Message): string | null {
  if (msg.payload?.category) return msg.payload.category
  if (msg.content?.startsWith('proof_category:')) return msg.content.replace('proof_category:', '').trim()
  return null
}

// Extract photo_id from message
function extractPhotoId(msg: Message): string | null {
  if (msg.payload?.photo_id) return msg.payload.photo_id
  return null
}

function useCountdown(targetIso: string | null): string {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!targetIso) { setDisplay(''); return }
    const iso = targetIso
    function update() {
      const ms = new Date(iso).getTime() - Date.now()
      if (ms <= 0) { setDisplay(''); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setDisplay(`${h}h ${m}m ${s}s`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [targetIso])
  return display
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
  const proofFileInputRef = useRef<HTMLInputElement>(null)

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
  const [showCoachTip, setShowCoachTip] = useState(false)
  const [usedQuickReplies, setUsedQuickReplies] = useState<Set<string>>(new Set())
  const [heartState, setHeartState] = useState<HeartState>({})
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  // Proof of the Day state
  const [canPostProof, setCanPostProof] = useState<boolean | null>(null)
  const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [proofToast, setProofToast] = useState('')

  const countdown = useCountdown(canPostProof === false ? nextAllowedAt : null)

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

  async function loadHeartStates(msgs: Message[], currentUserId: string) {
    const proofMsgs = msgs.filter(m => m.media_type === 'proof_photo')
    if (proofMsgs.length === 0) return
    const photoIds = proofMsgs.map(m => extractPhotoId(m)).filter(Boolean) as string[]
    if (photoIds.length === 0) return

    const { data: hearts } = await supabase
      .from('proof_hearts')
      .select('photo_id, user_id')
      .in('photo_id', photoIds)

    const counts: Record<string, number> = {}
    const myHearts = new Set<string>()
    hearts?.forEach(h => {
      counts[h.photo_id] = (counts[h.photo_id] || 0) + 1
      if (h.user_id === currentUserId) myHearts.add(h.photo_id)
    })

    const newState: HeartState = {}
    photoIds.forEach(id => {
      newState[id] = { count: counts[id] || 0, hearted: myHearts.has(id) }
    })
    setHeartState(prev => ({ ...prev, ...newState }))
  }

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

      const coachTipSeen = localStorage.getItem('nuroni-coach-tip')
      if (!coachTipSeen) setShowCoachTip(true)

      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)
      setFollowedIds(new Set(Array.from(follows?.map(f => f.following_id) || [])))

      const { data: msgs } = await supabase
        .from('messages').select('*').order('created_at', { ascending: true }).limit(50)

      const initialMsgs = msgs || []
      setMessages(initialMsgs)

      if (initialMsgs.length > 0) {
        const ids = Array.from(new Set(initialMsgs.map(m => m.user_id)))
        fetchProfiles(ids).then(cache => {
          setProfileCache(cache)
          setMessages(prev => prev.map(m => ({ ...m, ...cache[m.user_id] })))
        })
        setTimeout(() => loadHeartStates(initialMsgs, user.id), 200)
      }

      // Check proof status
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('proof_photos').select('id, created_at').eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo).limit(1)

      if (recent && recent.length > 0) {
        setCanPostProof(false)
        const next = new Date(new Date(recent[0].created_at).getTime() + 24 * 60 * 60 * 1000)
        setNextAllowedAt(next.toISOString())
      } else {
        setCanPostProof(true)
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
          if (newMsg.media_type === 'proof_photo') {
            const pid = extractPhotoId(newMsg)
            if (pid) setHeartState(prev => ({ ...prev, [pid]: { count: 0, hearted: false } }))
          }
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
    if (showTip) { const t = setTimeout(dismissTip, 6000); return () => clearTimeout(t) }
  }, [showTip])

  useEffect(() => {
    if (proofToast) { const t = setTimeout(() => setProofToast(''), 3000); return () => clearTimeout(t) }
  }, [proofToast])

  function buildContext(currentMessages: Message[]): { role: string; content: string; coach_id?: string; had_quick_replies?: boolean }[] {
    return currentMessages.slice(-6).filter(m => m.content && !m.content.startsWith('proof_category:')).map(m => ({
      role: COACH_IDS.has(m.user_id) ? 'assistant' : 'user',
      content: m.content,
      coach_id: COACH_IDS.has(m.user_id) ? m.user_id : undefined,
      had_quick_replies: !!(m.quick_replies && m.quick_replies.length > 0),
    }))
  }

  async function openProfile(msg: Message) {
    if (!msg.username || msg.is_coach || COACH_IDS.has(msg.user_id)) return
    const { data: goal } = await supabase.from('goals').select('goal_weight').eq('user_id', msg.user_id).maybeSingle()
    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', msg.user_id)
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

  function dismissTip() { setShowTip(false); localStorage.setItem('nuroni-chat-tip', '1') }
  function dismissCoachTip() { setShowCoachTip(false); localStorage.setItem('nuroni-coach-tip', '1') }

  async function toggleHeart(photoId: string) {
    if (!userId) return
    const current = heartState[photoId] || { count: 0, hearted: false }
    if (current.hearted) {
      setHeartState(prev => ({ ...prev, [photoId]: { count: Math.max(0, prev[photoId]?.count - 1), hearted: false } }))
      await supabase.from('proof_hearts').delete().eq('photo_id', photoId).eq('user_id', userId)
    } else {
      setHeartState(prev => ({ ...prev, [photoId]: { count: (prev[photoId]?.count || 0) + 1, hearted: true } }))
      await supabase.from('proof_hearts').insert({ photo_id: photoId, user_id: userId })
    }
  }

  async function sendMessage(text?: string, mediaUrl?: string, mediaType?: string, fromPill?: boolean) {
    const content = (text || input).trim()
    if (!content && !mediaUrl) return
    if (sending) return

    const atMentionBlocked = !isAdmin && /(?<!^)@(?!coach\b)/i.test(content)
    if (!isAdmin && content && (isBlocked(content) || atMentionBlocked)) {
      setBlockedNotice(true)
      setTimeout(() => setBlockedNotice(false), 3000)
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimistic: Message = { id: tempId, user_id: userId, content, media_url: mediaUrl || null, media_type: mediaType || null, created_at: new Date().toISOString(), ...profileCache[userId] }
    setMessages(prev => [...prev, optimistic])
    if (!text) setInput('')
    inputRef.current?.focus()

    setSending(true)
    const { data, error } = await supabase.from('messages').insert({ user_id: userId, content, media_url: mediaUrl || null, media_type: mediaType || null }).select().maybeSingle()
    setSending(false)

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      if (!text && !mediaUrl) setInput(content)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, ...profileCache[userId] } : m))
      if (content) {
        const context = buildContext(messages)
        fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, user_id: userId, context, from_pill: fromPill || false }),
        }).catch(() => {})
      }
    }
  }

  async function handleQuickReply(msgId: string, reply: string) {
    setUsedQuickReplies(prev => new Set(Array.from(prev).concat(msgId)))
    await sendMessage(reply, undefined, undefined, true)
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

  function handleProofButtonClick() {
    if (!canPostProof) {
      if (countdown) setProofToast(`Next Proof available in ${countdown}`)
      else setProofToast('Already posted your Proof of the Day!')
      return
    }
    setShowCategoryPicker(true)
  }

  function handleCategorySelect(cat: string) {
    setSelectedCategory(cat)
    setShowCategoryPicker(false)
    setTimeout(() => proofFileInputRef.current?.click(), 100)
  }

  async function handleProofFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedCategory) return
    if (file.size > 10 * 1024 * 1024) { setProofToast('Max 10MB'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', selectedCategory)

    const res = await fetch('/api/proof/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)

    if (data.error === 'already_posted_today') {
      setCanPostProof(false)
      if (data.next_allowed_at) setNextAllowedAt(data.next_allowed_at)
      setProofToast('Already posted your Proof of the Day!')
    } else if (data.success) {
      setCanPostProof(false)
      setNextAllowedAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      setProofToast('Proof posted!')
    } else {
      setProofToast('Upload failed. Try again.')
    }

    setSelectedCategory(null)
    if (proofFileInputRef.current) proofFileInputRef.current.value = ''
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
    <div className="flex flex-col flex-1 min-h-0 max-w-lg mx-auto w-full overflow-x-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div>
          <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Fitness Chat</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Plus+ members · fitness topics only</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)', color: '#0D1117' }}>Live</span>
      </div>

      {/* Tip: tap names */}
      {showTip && (
        <div className="mx-4 mt-2 px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(45,212,191,0.3)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-text)', lineHeight: 1.5 }}>Tap any name to check their stats and follow their journey.</p>
          <button onClick={dismissTip} style={{ color: 'var(--accent-text)', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Tip: @coach */}
      {!showTip && showCoachTip && (
        <div className="mx-4 mt-2 px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <p className="text-xs" style={{ color: '#a78bfa', lineHeight: 1.5 }}>
            Type <strong>@coach</strong> before your message to get a reply from one of our AI fitness coaches.
          </p>
          <button onClick={dismissCoachTip} style={{ color: '#a78bfa', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
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
          const specialty = isCoach ? COACH_SPECIALTIES[msg.user_id] : null
          const hasQuickReplies = isCoach && msg.quick_replies && msg.quick_replies.length > 0 && !usedQuickReplies.has(msg.id)
          const isLastCoachMsg = hasQuickReplies && !messages.slice(i + 1).some(m => COACH_IDS.has(m.user_id))
          const isProofPhoto = msg.media_type === 'proof_photo'
          const photoId = extractPhotoId(msg)
          const category = extractProofCategory(msg)
          const hearts = photoId ? (heartState[photoId] || { count: 0, hearted: false }) : null

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
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontSize: '9px', border: '1px solid rgba(167,139,250,0.3)' }}>AI COACH</span>
                  )}
                  {isCoach && specialty && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.08)', color: 'rgba(167,139,250,0.7)', fontSize: '9px', border: '1px solid rgba(167,139,250,0.15)' }}>{specialty}</span>
                  )}
                  {!isCoach && isFollowed && <span className="ml-1">⭐</span>}
                  {!isCoach && msg.is_admin && (
                    <span className="ml-1 text-xs px-1 rounded" style={{ background: 'var(--accent)', color: '#0D1117', fontSize: '9px' }}>ADMIN</span>
                  )}
                  {!isCoach && lostSoFar !== null && lostSoFar > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>-{lostSoFar} {msg.weight_unit || 'lbs'}</span>
                  )}
                </button>
              )}

              {/* Proof Photo */}
              {isProofPhoto && msg.media_url && (
                <div style={{ maxWidth: '90%', width: '100%' }}>
                  {category && (
                    <div className="mb-1.5 ml-0.5">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${CATEGORY_COLORS[category] || '#888'}22`, color: CATEGORY_COLORS[category] || 'var(--accent)', border: `1px solid ${CATEGORY_COLORS[category] || '#888'}55` }}>
                        {category}
                      </span>
                    </div>
                  )}
                  <div className="rounded-2xl overflow-hidden cursor-pointer" style={{ border: '1px solid var(--border)' }} onClick={() => setFullscreenPhoto(msg.media_url!)}>
                    <img src={msg.media_url} alt={`Proof - ${category || ''}`} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                  </div>
                  {photoId && hearts && (
                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                      <button onClick={() => toggleHeart(photoId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={hearts.hearted ? '#f43f5e' : 'none'} stroke={hearts.hearted ? '#f43f5e' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span className="text-xs font-medium" style={{ color: hearts.hearted ? '#f43f5e' : 'var(--text-muted)' }}>{hearts.count > 0 ? hearts.count : ''}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Regular admin media */}
              {!isProofPhoto && msg.media_url && (
                <div className="max-w-[80%] mb-1">
                  <img src={msg.media_url} alt="shared media" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 12, display: 'block' }} />
                </div>
              )}

              {msg.content && !msg.content.startsWith('proof_category:') && (
                <div className="max-w-[80%] px-3 py-2 rounded-2xl text-sm" style={{
                  background: isMe ? 'var(--accent)' : isCoach ? 'rgba(167,139,250,0.08)' : isFollowed ? 'rgba(45,212,191,0.08)' : 'var(--bg-card)',
                  color: isMe ? '#0D1117' : 'var(--text-primary)',
                  border: isMe ? 'none' : isCoach ? '1px solid rgba(167,139,250,0.25)' : isFollowed ? '1px solid rgba(45,212,191,0.3)' : '1px solid var(--border)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: !isMe ? 4 : undefined,
                  opacity: msg.id.startsWith('temp-') ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  wordBreak: 'break-word',
                }}>
                  <MessageContent content={msg.content} isAdmin={!!(msg.is_admin || isMe)} isMe={isMe} />
                </div>
              )}

              {isLastCoachMsg && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                  {msg.quick_replies!.map((reply, ri) => (
                    <button key={ri} onClick={() => handleQuickReply(msg.id, reply)} disabled={sending} className="text-xs px-3 py-1.5 rounded-full font-medium transition-all" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', cursor: 'pointer' }}>
                      {reply}
                    </button>
                  ))}
                  <button onClick={() => setUsedQuickReplies(prev => new Set(Array.from(prev).concat(msg.id)))} className="text-xs px-3 py-1.5 rounded-full font-medium transition-all" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    Other...
                  </button>
                </div>
              )}

              <span className="text-xs mt-0.5 mx-1" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.created_at)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Profile modal */}
      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setProfileModal(null)}>
          <div className="card w-full max-w-sm p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profileModal.display_name}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{profileModal.username} · {profileModal.follower_count} follower{profileModal.follower_count !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => toggleFollow(profileModal.user_id)} disabled={followLoading || profileModal.user_id === userId} className={followedIds.has(profileModal.user_id) ? 'btn-secondary py-2 px-3 text-sm gap-1.5' : 'btn-primary py-2 px-3 text-sm gap-1.5'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={followedIds.has(profileModal.user_id) ? 'var(--accent)' : 'currentColor'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {followedIds.has(profileModal.user_id) ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card text-center p-3"><div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profileModal.current_weight}</div><div className="stat-label">{profileModal.weight_unit} now</div></div>
              <div className="stat-card text-center p-3"><div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--success)' }}>{profileModal.start_weight - profileModal.current_weight > 0 ? `-${parseFloat((profileModal.start_weight - profileModal.current_weight).toFixed(1))}` : '0'}</div><div className="stat-label">lost</div></div>
              <div className="stat-card text-center p-3"><div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profileModal.goal_weight || '-'}</div><div className="stat-label">goal</div></div>
            </div>
            <a href={`/u/${profileModal.username}`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-sm" style={{ display: 'flex', textDecoration: 'none' }}>View full profile</a>
          </div>
        </div>
      )}

      {/* Category picker */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowCategoryPicker(false)}>
          <div className="card w-full max-w-sm p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Proof of the Day</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>What are you posting proof of?</p>
            <div className="grid grid-cols-2 gap-2">
              {['Gym', 'Walk', 'Meal', 'Other'].map(cat => (
                <button key={cat} onClick={() => handleCategorySelect(cat)} className="py-3 px-4 rounded-xl font-semibold text-sm transition-all" style={{ background: `${CATEGORY_COLORS[cat]}15`, color: CATEGORY_COLORS[cat], border: `1.5px solid ${CATEGORY_COLORS[cat]}40`, cursor: 'pointer' }}>
                  {cat === 'Gym' ? '🏋️ Gym' : cat === 'Walk' ? '🚶 Walk' : cat === 'Meal' ? '🥗 Meal' : '📸 Other'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen photo */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setFullscreenPhoto(null)}>
          <button onClick={() => setFullscreenPhoto(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={fullscreenPhoto} alt="Proof" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {blockedNotice && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
          Keep it in-app — links, socials, and contact info are not allowed here.
        </div>
      )}

      {proofToast && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
          {proofToast}
        </div>
      )}

      {uploading && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
          Uploading...
        </div>
      )}

      {/* Countdown bar — shown when user can't post yet */}
      {!isAdmin && canPostProof === false && countdown && (
        <div className="mx-4 mb-1 px-3 py-2 rounded-xl text-xs text-center" style={{ background: 'rgba(45,212,191,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(45,212,191,0.15)' }}>
          Next Proof of the Day in <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{countdown}</span>
        </div>
      )}

      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
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
          {!isAdmin && (
            <>
              <input ref={proofFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProofFileSelect} />
              <button
                onClick={handleProofButtonClick}
                disabled={uploading}
                className="flex-shrink-0 p-2.5 rounded-xl"
                title={canPostProof ? 'Post Proof of the Day' : 'Already posted today'}
                style={{
                  background: 'var(--bg-input)',
                  color: canPostProof ? 'var(--accent)' : 'var(--text-muted)',
                  opacity: canPostProof === null ? 0.5 : 1,
                  transition: 'color 0.2s, opacity 0.2s',
                  border: canPostProof ? '1px solid rgba(45,212,191,0.3)' : '1px solid transparent',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            </>
          )}
          <input
            ref={inputRef}
            className="input-base flex-1"
            placeholder={isAdmin ? 'Send anything...' : 'Chat or type @coach to ask a coach...'}
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
        {!isAdmin && <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Use @coach to talk to an AI coach · No links or self-promotion</p>}
      </div>
    </div>
  )
}
