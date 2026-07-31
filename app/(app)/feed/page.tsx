'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEventSwitcher } from '@/providers/EventProvider'

// Bare /feed has no event id, so it can't render a feed itself — it exists
// only so links like the nav rail's "Home" tab and the post-login redirect
// don't need to know an event id up front. It forwards to whichever event is
// active (falling back to the user's first membership) as soon as that's
// known, then the real page lives at /feed/[eventId]. Any query string
// (e.g. ?compose=1 from the "New Post" CTA) is forwarded along.
export default function FeedRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeEvent, memberships, isLoading } = useEventSwitcher()

  useEffect(() => {
    if (isLoading) return
    const eventId = activeEvent?.id ?? memberships[0]?.eventId
    if (!eventId) {
      router.replace('/welcome')
      return
    }
    const query = searchParams.toString()
    router.replace(`/feed/${eventId}${query ? `?${query}` : ''}`)
  }, [isLoading, activeEvent, memberships, router, searchParams])

  return null
}
