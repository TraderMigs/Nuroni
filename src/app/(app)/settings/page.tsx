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
  const [proofPhotosPublic, setProofPhotosPublic] = useState(true)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [userId, setUserId] = useState('')
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false)
  const [savingLeaderboard, setSavingLeaderboard] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralEnabled, setReferralEnabled] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('proof_photos_public, referral_code, leaderboard_opt_in').eq('id', user.id).maybeSingle()
      if (data) {
        setProofPhotosPublic(data.proof_photos_public ?? true)
        setReferralCode(data.referral_code || '')
        setLeaderboardOptIn(data.leaderboard_opt_in || false)
      }
      const { data: appSettings } = await supabase.from('app_settings').select('referral_enabled').eq('id', 1).maybeSingle()
      setReferralEnabled(appSettings?.referral_enabled || false)
    }
    load()
  }, [supabase])

  async function saveProofPrivacy(val: boolean) {
    setSavingPrivacy(true)
    await supabase.from('profiles').update({ proof_photos_public: val }).eq('id', userId)
    setProofPhotosPublic(val)
    setSavingPrivacy(false)
    setToast(val ? 'Proof photos set to public ✓' : 'Proof photos set to private ✓')
  }

  async function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('proof_hearts').delete().eq('user_id', user.id)
    await supabase.from('proof_photos').delete().eq('user_id', user.id)
    await supabase.from('messages').delete().eq('user_id', user.id)
    await supabase.from('entries').delete().eq('user_id', user.id)
    await supabase.from('goals').delete().eq('user_id', user.id)
    await supabase.from('referrals').delete().eq('referrer_id', user.id)
    await supabase.from('referrals').delete().eq('referred_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/?deleted=1')
  }

  async function saveLeaderboardOptIn(val: boolean) {
    setSavingLeaderboard(true)
    setLeaderboardOptIn(val)
    await supabase.from('profiles').update({ leaderboard_opt_in: val }).eq('id', userId)
    setSavingLeaderboard(false)
  }

  async function copyReferral() {
    const link = `${window.location.origin}/signup?ref=${referralCode}`
    await navigator.clipboard.writeText(link)
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 2500)
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 overflow-x-hidden">
      {toast && (
        <div className="toast" onClick={() => setToast('')}>{toast}</div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Account and privacy</p>
      </div>

      {/* Privacy */}
      {referralCode && referralEnabled && (
        <div className="card p-4 mb-4" style={{ border: '1px solid rgba(45,212,191,0.25)', background: 'rgba(45,212,191,0.03)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>🎁 Give a friend a free month</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>When a friend signs up with your link and subscribes, you earn a free month automatically.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl text-xs truncate" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              nuroni.app/signup?ref={referralCode}
            </div>
            <button onClick={copyReferral} className="btn-primary py-2 px-3 text-xs flex-shrink-0">
              {referralCopied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Privacy</h2>
        <div className="flex items-center justify-between">
          <div style={{ flex: 1, marginRight: 12 }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Proof of the Day photos</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Let others see your daily photo history on your profile</p>
          </div>
          <button
            onClick={() => saveProofPrivacy(!proofPhotosPublic)}
            disabled={savingPrivacy}
            style={{ background: proofPhotosPublic ? 'var(--accent)' : 'var(--border)', width: 44, height: 26, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.2s', left: proofPhotosPublic ? '21px' : '3px' }} />
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Leaderboard</h2>
        <div className="flex items-center justify-between">
          <div style={{ flex: 1, marginRight: 12 }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Appear on weekly leaderboard</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Show your name and weekly step count in the chat leaderboard. Off by default.</p>
          </div>
          <button
            onClick={() => saveLeaderboardOptIn(!leaderboardOptIn)}
            disabled={savingLeaderboard}
            style={{ background: leaderboardOptIn ? 'var(--accent)' : 'var(--border)', width: 44, height: 26, borderRadius: 999, position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 3, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.2s', left: leaderboardOptIn ? '21px' : '3px' }} />
          </button>
        </div>
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
              This will permanently delete your profile, all entries, goals, chat messages, and proof photos. Cancel your Plus+ subscription first in Profile.
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
