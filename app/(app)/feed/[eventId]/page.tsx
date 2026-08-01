'use client'

import {use, useEffect, useMemo, useRef} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt, ComposerCard} from '@/components/feed'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'
import {ModuleKeyConvention} from "@/lib/api/types";
import {useEventPosts} from "@/hooks";

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params)
    const t = useTranslations('FeedPage')
    const router = useRouter()
    const searchParams = useSearchParams()
    const shouldCompose = searchParams.get('compose') === '1'
    const composerRef = useRef<HTMLDivElement>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    const { data: event, error } = useEvent(eventId)
    const { setActiveEventId } = useEventSwitcher()
    const { data: postPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(eventId)
    const posts = useMemo(() => postPages?.pages.flatMap(page => page.content) ?? [], [postPages])

    // Auto-load the next page as the sentinel at the bottom of the list
    // scrolls into view.
    useEffect(() => {
        const sentinel = loadMoreRef.current
        if (!sentinel || !hasNextPage) return

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) fetchNextPage()
        })
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasNextPage, fetchNextPage, posts.length])


    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId)
    }, [event, eventId, setActiveEventId])

    // ?compose=1 (from the nav rail's "New Post" CTA) scrolls to and expands
    // the composer, then strips itself so a refresh doesn't re-trigger it.
    useEffect(() => {
        if (!shouldCompose || !event) return
        composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        router.replace(`/feed/${eventId}`)
    }, [shouldCompose, eventId, router, event])

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
            event.description && <section className={'alegreya-light text-lg p-3 text-center'}>
                <p>{event.description}</p>
            </section>
        }
        {
            moduleFlags.rsvp && <section className={'mt-3 px-4'}>
                <RsvpPrompt deadline={event?.schedule.rsvpDeadline ?? null}/>
            </section>
        }

        {/* Posts */}
        <section className={'mt-5'}>
            {moduleFlags.posts && (
                <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
                    <div ref={composerRef}>
                        <ComposerCard eventId={eventId} autoExpand={shouldCompose} />
                    </div>
                    {posts.map(post => (
                        <PostCard key={post.id} post={post}/>
                    ))}
                    <div ref={loadMoreRef} className="h-1" />
                    {isFetchingNextPage && (
                        <p className="text-center text-sm text-ink-muted py-2">{t('loadingMore')}</p>
                    )}
                </div>
            )}
        </section>
    </div>
    )
}
