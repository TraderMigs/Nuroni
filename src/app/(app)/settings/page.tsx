'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [notifPermission, setNotifPermission] = useState<string>('default')
  const [savingReminder, setSavingReminder] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)

    async function loadReminder() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('reminder_enabled, reminder_time').eq('id', user.id).maybeSingle()
      if (data) {
        setReminderEnabled(data.reminder_enabled || false)
        setReminderTime(data.reminder_time || '20:00')
        if (data.reminder_enabled) scheduleReminder(data.reminder_time || '20:00')
      }
    }
    loadReminder()
  }, [supabase])

  function scheduleReminder(time: string) {
    if (!('serviceWorker' in navigator)) return
    const [hour, minute] = time.split(':').map(Number)
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'SCHEDULE_REMINDER', hour, minute })
    })
  }

  function cancelReminder() {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'CANCEL_REMINDER' })
    })
  }

  async function saveReminder(enabled: boolean, time: string) {
    setSavingReminder(true)

    // Request notification permission if enabling
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
      if (perm !== 'granted') {
        setToast('Notification permission denied')
        setSavingReminder(false)
        return
      }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      reminder_enabled: enabled,
      reminder_time: time,
    }).eq('id', user.id)

    if (enabled) {
      scheduleReminder(time)
      setToast('Reminder set ✓')
    } else {
      cancelReminder()
      setToast('Reminder off')
    }
    setSavingReminder(false)
  }

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages').delete().eq('user_id', user.id)
    await supabase.from('entries').delete().eq('user_id', user.id)
    await supabase.from('goals').delete().eq('user_id', user.id)
    await supabase.from('referrals').delete().eq('referrer_id', user.id)
    await supabase.from('referrals').delete().eq('referred_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/?deleted=1')
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 overflow-x-hidden">
      {toast && (
        <div className="toast">{toast}</div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account and notifications</p>
      </div>

      {/* Daily Reminder */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Daily step reminder</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Get a daily nudge to log your steps and weight.</p>

        {notifPermission === 'denied' && (
          <div className="px-3 py-2 rounded-xl text-xs mb-3" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
            Notifications are blocked in your browser settings. Enable them to use this feature.
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enable reminder</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reminds you once per day</p>
          </div>
          <button
            onClick={() => {
              const next = !reminderEnabled
              setReminderEnabled(next)
              saveReminder(next, reminderTime)
            }}
            disabled={savingReminder}
            style={{ background: reminderEnabled ? 'var(--accent)' : 'var(--border)', width: 44, height: 26, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{
              position: 'absolute', top: 3, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.2s',
              left: reminderEnabled ? '21px' : '3px',
            }} />
          </button>
        </div>

        {reminderEnabled && (
          <div className="animate-fade-in">
            <label className="label">Reminder time</label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                className="input-base flex-1"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
              />
              <button
                onClick={() => saveReminder(true, reminderTime)}
                disabled={savingReminder}
                className="btn-primary py-3 px-4 text-sm"
              >
                {savingReminder ? '…' : 'Save'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Note: Reminder only works while the app is installed as a PWA and your device allows notifications.
            </p>
          </div>
        )}
      </div>

      {/* Legal */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Legal</h2>
        <div className="space-y-2">
          <Link href="/terms" target="_blank" className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)', textDecoration: 'none' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Terms of Service</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </Link>
          <Link href="/privacy" target="_blank" className="flex items-center justify-between py-2" style={{ textDecoration: 'none' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Privacy Policy</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Support */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Support</h2>
        <a href="mailto:nuroniapp@gmail.com" className="flex items-center justify-between py-2" style={{ textDecoration: 'none' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Contact support</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>nuroniapp@gmail.com</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      {/* Danger zone */}
      <div className="card p-4" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)' }}>Danger zone</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Permanently delete your account and all data. This cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary text-sm w-full" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
              This will permanently delete your profile, all entries, goals, and chat messages. Cancel your Plus+ subscription first in Profile.
            </div>
            <div>
              <label className="label">Type DELETE to confirm</label>
              <input className="input-base" placeholder="DELETE" value={confirmText} onChange={e => setConfirmText(e.target.value)} style={{ borderColor: confirmText === 'DELETE' ? 'var(--danger)' : 'var(--border)' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setConfirmText('') }} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting || confirmText !== 'DELETE'} className="flex-1 text-sm py-3 px-4 rounded-xl font-semibold"
                style={{ background: confirmText === 'DELETE' ? 'var(--danger)' : 'rgba(239,68,68,0.2)', color: '#fff', border: 'none', cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
