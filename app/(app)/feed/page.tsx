'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEventSwitcher } from '@/providers/EventProvider'

// Bare /feed has no event id, so it can't render a feed itself — it exists
// only so links like the nav rail's "Home" tab and the post-login redirect
// don't need to know an event id up front. It forwards to whichever event is
// active (falling back to the user's first membership) as soon as that's
// known, then the real page lives at /feed/[eventId].
export default function FeedRedirectPage() {
  const router = useRouter()
  const { activeEvent, memberships, isLoading } = useEventSwitcher()

  useEffect(() => {
    if (isLoading) return
    const eventId = activeEvent?.id ?? memberships[0]?.eventId
    if (eventId) router.replace(`/feed/${eventId}`)
  }, [isLoading, activeEvent, memberships, router])

  return null
}
