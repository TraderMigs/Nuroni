'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{msg}</div>
}

interface JournalEntry {
  id: string
  title: string | null
  body: string | null
  image_url: string | null
  entry_date: string
  created_at: string
}

function getTodayLocal(): string {
  return new Date().toISOString().split('T')[0]
}

export default function GoalsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [isPlus, setIsPlus] = useState(false)
  const [userId, setUserId] = useState('')

  const [form, setForm] = useState({
    goal_weight: '',
    daily_step_goal: '',
    target_date: '',
  })

  // Journal state
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [journalLoading, setJournalLoading] = useState(false)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [editingJournal, setEditingJournal] = useState<string | null>(null)
  const [deletingJournal, setDeletingJournal] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [savingJournal, setSavingJournal] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const journalImageRef = useRef<HTMLInputElement>(null)
  const editImageRef = useRef<HTMLInputElement>(null)

  const [newEntry, setNewEntry] = useState({
    title: '',
    body: '',
    image_url: '',
    entry_date: getTodayLocal(),
  })

  const [editEntry, setEditEntry] = useState({
    title: '',
    body: '',
    image_url: '',
    entry_date: '',
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from('profiles').select('weight_unit, is_plus').eq('id', user.id).maybeSingle(),
      supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    if (p) { setUnit(p.weight_unit); setIsPlus(p.is_plus || false) }
    if (g) setForm({
      goal_weight: String(g.goal_weight),
      daily_step_goal: String(g.daily_step_goal),
      target_date: g.target_date ? g.target_date.split('T')[0] : '',
    })
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  const loadJournals = useCallback(async () => {
    if (!userId || !isPlus) return
    setJournalLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('id, title, body, image_url, entry_date, created_at')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(50)
    setJournals(data || [])
    setJournalLoading(false)
  }, [supabase, userId, isPlus])

  useEffect(() => { loadJournals() }, [loadJournals])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('goals').upsert({
      user_id: user.id,
      goal_weight: parseFloat(form.goal_weight),
      daily_step_goal: parseInt(form.daily_step_goal),
      target_date: form.target_date || null,
    })
    setSaving(false)
    if (!error) setToast('Goals saved ✓')
  }

  async function uploadJournalImage(file: File, forEdit = false): Promise<string | null> {
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('journal-images').upload(path, file, { upsert: true })
    if (error) { setToast('Image upload failed'); setUploadingImage(false); return null }
    const { data: urlData } = supabase.storage.from('journal-images').getPublicUrl(path)
    setUploadingImage(false)
    if (forEdit) setEditEntry(e => ({ ...e, image_url: urlData.publicUrl }))
    else setNewEntry(e => ({ ...e, image_url: urlData.publicUrl }))
    return urlData.publicUrl
  }

  async function saveNewEntry() {
    if (!newEntry.body && !newEntry.title) return
    setSavingJournal(true)
    const { error } = await supabase.from('journal_entries').insert({
      user_id: userId,
      title: newEntry.title || null,
      body: newEntry.body || null,
      image_url: newEntry.image_url || null,
      entry_date: newEntry.entry_date,
    })
    if (!error) {
      setToast('Journal entry saved ✓')
      setNewEntry({ title: '', body: '', image_url: '', entry_date: getTodayLocal() })
      setShowNewEntry(false)
      await loadJournals()
    }
    setSavingJournal(false)
  }

  function startEditJournal(entry: JournalEntry) {
    setEditingJournal(entry.id)
    setEditEntry({ title: entry.title || '', body: entry.body || '', image_url: entry.image_url || '', entry_date: entry.entry_date })
    setShowDeleteConfirm(null)
  }

  async function saveEditJournal(id: string) {
    setSavingJournal(true)
    const { error } = await supabase.from('journal_entries').update({
      title: editEntry.title || null,
      body: editEntry.body || null,
      image_url: editEntry.image_url || null,
      entry_date: editEntry.entry_date,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) {
      setToast('Entry updated ✓')
      setEditingJournal(null)
      await loadJournals()
    }
    setSavingJournal(false)
  }

  async function deleteJournal(id: string) {
    setDeletingJournal(id)
    await supabase.from('journal_entries').delete().eq('id', id)
    setToast('Entry deleted')
    setEditingJournal(null)
    setShowDeleteConfirm(null)
    setDeletingJournal(null)
    await loadJournals()
  }

  function downloadEntry(entry: JournalEntry) {
    const date = new Date(entry.entry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const text = `${entry.title ? entry.title + '\n' : ''}${date}\n\n${entry.body || ''}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-${entry.entry_date}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setToast('Entry downloaded ✓')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 overflow-x-hidden space-y-5">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Goals</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>What are you working toward?</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Goal weight ({unit})</label>
          <input className="input-base" type="number" step="0.1" placeholder="160" value={form.goal_weight} onChange={e => setForm(f => ({ ...f, goal_weight: e.target.value }))} />
        </div>

        <div>
          <label className="label">Daily step goal</label>
          <input className="input-base" type="number" placeholder="8000" value={form.daily_step_goal} onChange={e => setForm(f => ({ ...f, daily_step_goal: e.target.value }))} />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Most health guidelines suggest 7,000–10,000 steps/day.</p>
        </div>

        <div>
          <label className="label">Target date <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <input className="input-base" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>

        {form.target_date && form.goal_weight && (
          <div className="rounded-xl p-3" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
              Target: {form.goal_weight} {unit} by {new Date(form.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        <button className="btn-primary w-full" onClick={save} disabled={saving || !form.goal_weight || !form.daily_step_goal}>
          {saving ? 'Saving…' : 'Save goals'}
        </button>
      </div>

      {/* Journal Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              📓 Journal
              {!isPlus && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#0D1117' }}>Plus+</span>}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Private entries. Only you can see these.</p>
          </div>
          {isPlus && (
            <button
              onClick={() => { setShowNewEntry(v => !v); setEditingJournal(null) }}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              {showNewEntry ? 'Cancel' : '+ New entry'}
            </button>
          )}
        </div>

        {!isPlus && (
          <div className="card p-4 text-center" style={{ border: '1px dashed var(--border)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Upgrade to Plus+ to unlock your private journal.</p>
            <button onClick={() => router.push('/plus')} className="btn-primary text-sm py-2 px-4">Upgrade to Plus+</button>
          </div>
        )}

        {isPlus && showNewEntry && (
          <div className="card p-4 space-y-3 mb-4 animate-fade-in" style={{ border: '1px solid var(--accent)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>New entry</p>
              <input
                type="date"
                className="input-base text-xs py-1 px-2"
                style={{ width: 'auto' }}
                value={newEntry.entry_date}
                max={getTodayLocal()}
                onChange={e => setNewEntry(v => ({ ...v, entry_date: e.target.value }))}
              />
            </div>
            <input
              className="input-base"
              placeholder="Title (optional)"
              value={newEntry.title}
              onChange={e => setNewEntry(v => ({ ...v, title: e.target.value }))}
            />
            <textarea
              className="input-base"
              placeholder="What's on your mind today?"
              rows={4}
              value={newEntry.body}
              onChange={e => setNewEntry(v => ({ ...v, body: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
            {newEntry.image_url && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={newEntry.image_url} alt="Journal" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover' }} />
                <button
                  onClick={() => setNewEntry(v => ({ ...v, image_url: '' }))}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 12 }}
                >✕</button>
              </div>
            )}
            <input ref={journalImageRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) uploadJournalImage(e.target.files[0]) }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => journalImageRef.current?.click()}
                disabled={uploadingImage}
                className="btn-secondary text-xs py-2 px-3 gap-1.5"
              >
                {uploadingImage ? 'Uploading…' : '📷 Add image'}
              </button>
              <button
                onClick={saveNewEntry}
                disabled={savingJournal || (!newEntry.body && !newEntry.title)}
                className="btn-primary flex-1 text-xs py-2"
              >
                {savingJournal ? 'Saving…' : 'Save entry'}
              </button>
            </div>
          </div>
        )}

        {isPlus && journalLoading && (
          <div className="text-center py-4">
            <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {isPlus && !journalLoading && journals.length === 0 && !showNewEntry && (
          <div className="card p-5 text-center" style={{ border: '1px dashed var(--border)' }}>
            <p className="text-2xl mb-2">📓</p>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Your journal is empty</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap + New entry to write your first entry.</p>
          </div>
        )}

        {isPlus && !journalLoading && journals.length > 0 && (
          <div className="space-y-2">
            {journals.map(entry => (
              <div key={entry.id} className="card p-4" style={{ border: editingJournal === entry.id ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                {editingJournal === entry.id ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Editing</p>
                      <input
                        type="date"
                        className="input-base text-xs py-1 px-2"
                        style={{ width: 'auto' }}
                        value={editEntry.entry_date}
                        max={getTodayLocal()}
                        onChange={e => setEditEntry(v => ({ ...v, entry_date: e.target.value }))}
                      />
                    </div>
                    <input className="input-base" placeholder="Title (optional)" value={editEntry.title} onChange={e => setEditEntry(v => ({ ...v, title: e.target.value }))} />
                    <textarea className="input-base" rows={4} value={editEntry.body} onChange={e => setEditEntry(v => ({ ...v, body: e.target.value }))} style={{ resize: 'vertical' }} />
                    {editEntry.image_url && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={editEntry.image_url} alt="Journal" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover' }} />
                        <button onClick={() => setEditEntry(v => ({ ...v, image_url: '' }))} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    )}
                    <input ref={editImageRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) uploadJournalImage(e.target.files[0], true) }}
                    />
                    {showDeleteConfirm === entry.id ? (
                      <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Delete this entry? Cannot be undone.</p>
                        <div className="flex gap-2">
                          <button onClick={() => deleteJournal(entry.id)} disabled={deletingJournal === entry.id} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer' }}>
                            {deletingJournal === entry.id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold btn-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => saveEditJournal(entry.id)} disabled={savingJournal} className="btn-primary flex-1 text-xs py-2">{savingJournal ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => editImageRef.current?.click()} disabled={uploadingImage} className="btn-secondary text-xs py-2 px-3">{uploadingImage ? '…' : '📷'}</button>
                        <button onClick={() => downloadEntry(entry)} className="btn-secondary text-xs py-2 px-3">⬇</button>
                        <button onClick={() => setShowDeleteConfirm(entry.id)} className="text-xs py-2 px-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setEditingJournal(null)} className="btn-secondary text-xs py-2 px-3">Cancel</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {entry.title && <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{entry.title}</p>}
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => downloadEntry(entry)} className="text-xs p-1.5 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>⬇</button>
                        <button onClick={() => startEditJournal(entry)} className="text-xs p-1.5 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>✏️</button>
                      </div>
                    </div>
                    {entry.image_url && (
                      <img src={entry.image_url} alt="Journal" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />
                    )}
                    {entry.body && <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
