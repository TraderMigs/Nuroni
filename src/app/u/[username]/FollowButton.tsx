'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FollowButton({ profileId }: { profileId: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      if (user.id === profileId) { setLoading(false); return }
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
        .maybeSingle()
      setFollowing(!!data)
      setLoading(false)
    }
    check()
  }, [supabase, profileId])

  async function toggle() {
    if (!userId || userId === profileId) return
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: profileId })
      setFollowing(true)
    }
    setLoading(false)
  }

  // Don't show button if not logged in or viewing own profile
  if (!userId || userId === profileId) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={following ? 'btn-secondary py-2 px-4 text-sm gap-1.5' : 'btn-primary py-2 px-4 text-sm gap-1.5'}
      style={{ flexShrink: 0 }}
    >
      {loading ? '…' : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={following ? 'var(--accent)' : 'currentColor'} stroke={following ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {following ? 'Following' : 'Follow'}
        </>
      )}
    </button>
  )
}
