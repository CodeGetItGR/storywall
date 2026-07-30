'use client'

import { use, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound} from '@/components/feed'
import { posts as initialPosts } from '@/lib/mock-data'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
  const t = useTranslations('FeedPage')
  const { eventId } = use(params)
  const [posts, setPosts] = useState(initialPosts)

  const { data: event, error } = useEvent(eventId)
  const { setActiveEventId } = useEventSwitcher()

  // Deep links (a shared invite, browser history, a bookmark) should make
  // this the active event for the rest of the app too, not just this page —
  // but only once we know it actually exists.
  useEffect(() => {
    if (event) setActiveEventId(eventId)
  }, [event, eventId, setActiveEventId])

  if (error instanceof ApiError && error.status === 404) {
    return <EventNotFound />
  }

  return (
    <div className="flex flex-col">
        <Header countdownTime={event?.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}/>
        <section>
            <Banner image={"/images/Banner.jpg"}/>
        </section>
        <section className={'mt-3'}>
            <EventInfo
                date={event?.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                type={event?.eventType ?? ''}
                place={event?.location.name ?? event?.location.address ?? ''}
                className={'w-full px-4'}
            />
        </section>
      {/* Stories row — sticky */}
      <div className="top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
        <StoriesRow />
      </div>

      {/* Feed heading */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-sm text-ink-muted mt-0.5">{event?.title ?? t('celebrateTheMoment')}</p>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
