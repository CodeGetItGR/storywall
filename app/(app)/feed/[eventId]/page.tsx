'use client'

import {use, useEffect, useMemo, useState} from 'react'
import {StoriesRow, PostCard, Header, Banner, EventInfo, EventNotFound, RsvpPrompt} from '@/components/feed'
import { posts as initialPosts } from '@/lib/mock-data'
import { useEvent } from '@/hooks/useEvent'
import { useEventSwitcher } from '@/providers/EventProvider'
import { ApiError } from '@/lib/api/client'
import {ModuleKeyConvention} from "@/lib/api/types";
import {useEventPosts} from "@/hooks";

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params)
    const [posts, setPosts] = useState(initialPosts)

    const { data: event, error } = useEvent(eventId)
    const { setActiveEventId } = useEventSwitcher()
    const {data, isPending} = useEventPosts(eventId)
    console.log('data', data)


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
                    {posts.map(post => (
                        <PostCard key={post.id} post={post}/>
                    ))}
                </div>
            )}
        </section>
    </div>
    )
}
