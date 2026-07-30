'use client'

import {use, useEffect, useMemo, useState} from 'react'
import { useTranslations } from 'next-intl'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt} from '@/components/feed'
import { posts as initialPosts } from '@/lib/mock-data'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'
import {EventTypeConvention, ModuleKeyConvention} from "@/lib/api/types";

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

  const moduleFlags = useMemo<Record<ModuleKeyConvention, boolean>>(()=> event ? Object.fromEntries(
      event.modules.map(({ moduleKey, isEnabled }) => [moduleKey, isEnabled])
  ) as Record<ModuleKeyConvention, boolean> : {rsvp:false, stories:false, posts:false, playlist:false, gallery:false},[event])

  if (!event || (error instanceof ApiError && error.status === 404)) {
    return <EventNotFound />
  }

  return (
    <div className="flex flex-col">
        <Header countdownTime={event?.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}/>
        <section>
            <Banner image={"/images/Banner.jpg"} title={event.title}/>
        </section>

        {/* Event Info */}
        <section className={'mt-3'}>
            <EventInfo
                date={event?.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0}
                type={event?.eventType ?? ''}
                place={event?.location.name ?? event?.location.address ?? ''}
                className={'w-full px-4'}
            />
        </section>
      {/* Stories row — sticky */}
        {
            moduleFlags.stories && <section className="top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
                <StoriesRow/>
            </section>
        }
        {/* Event Description */}
        {
            event.description && <section className={'alegreya-light text-lg'}>
                <p>{event.description}</p>
            </section>
        }
        {
            moduleFlags.rsvp && <section className={'mt-3 px-4'}>
                <RsvpPrompt deadline={event?.schedule.rsvpDeadline ?? null}/>
            </section>
        }

      {/* Feed heading */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-sm text-ink-muted mt-0.5">{event?.title ?? t('celebrateTheMoment')}</p>
      </div>

      {/* Posts */}
        {moduleFlags.posts && (
            <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
                {posts.map(post => (
                    <PostCard key={post.id} post={post}/>
                ))}
            </div>
        )}
    </div>
  )
}
