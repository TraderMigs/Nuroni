'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useState(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) })
  return <div className="toast">{msg}</div>
}

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState('')

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Delete all user data in order
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
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account and legal</p>
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
        <a
          href="mailto:nuroniapp@gmail.com"
          className="flex items-center justify-between py-2"
          style={{ textDecoration: 'none' }}
        >
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
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary text-sm w-full"
            style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
              This will permanently delete your profile, all entries, goals, and chat messages. Your Plus+ subscription will not be automatically cancelled — please cancel it separately in your Profile page first.
            </div>
            <div>
              <label className="label">Type DELETE to confirm</label>
              <input
                className="input-base"
                placeholder="DELETE"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                style={{ borderColor: confirmText === 'DELETE' ? 'var(--danger)' : 'var(--border)' }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setConfirmText('') }} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || confirmText !== 'DELETE'}
                className="flex-1 text-sm py-3 px-4 rounded-xl font-semibold"
                style={{ background: confirmText === 'DELETE' ? 'var(--danger)' : 'rgba(239,68,68,0.2)', color: '#fff', border: 'none', cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
