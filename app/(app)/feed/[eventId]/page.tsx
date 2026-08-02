'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef } from 'react';

import { Banner, ComposerCard, EventInfo, EventNotFound, Header, PostCard, PostModal, RsvpPrompt, StoriesRow } from '@/components/feed';
import { useEventPosts } from '@/hooks';
import { useEvent } from '@/hooks/useEvent';
import { ApiError } from '@/lib/api/client';
import { ModuleKeyConvention } from '@/lib/api/types';
import { useEventSwitcher } from '@/providers/EventProvider';

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const t = useTranslations('FeedPage');
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const { data: event, error } = useEvent(eventId);
    const { setActiveEventId } = useEventSwitcher();
    const { data: postPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(eventId);
    const posts = useMemo(() => postPages?.pages.flatMap((page) => page.content) ?? [], [postPages?.pages]);

    // Auto-load the next page as the sentinel at the bottom of the list
    // scrolls into view.
    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) fetchNextPage();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, posts.length]);

    // Deep links (a shared invite, browser history, a bookmark) should make
    // this the active event for the rest of the app too, not just this page —
    // but only once we know it actually exists.
    useEffect(() => {
        if (event) setActiveEventId(eventId);
    }, [event, eventId, setActiveEventId]);

    const moduleFlags = useMemo<Record<ModuleKeyConvention, boolean>>(
        () =>
            event
                ? (Object.fromEntries(event.modules.map(({ moduleKey, isEnabled }) => [moduleKey, isEnabled])) as Record<
                      ModuleKeyConvention,
                      boolean
                  >)
                : { rsvp: false, stories: false, posts: false, playlist: false, gallery: false },
        [event]
    );

    if (!event || (error instanceof ApiError && error.status === 404)) {
        return <EventNotFound />;
    }

    return (
        <div className="flex flex-col max-w-3xl mx-auto">
            <Header countdownTime={event?.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} />
            <section>
                <Banner image={'/images/Banner.jpg'} title={event.title} />
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
            {moduleFlags.stories && (
                <section className="top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
                    <StoriesRow eventId={eventId} />
                </section>
            )}
            {/* Event Description */}
            {event.description && (
                <section className={'alegreya-light text-lg p-3 text-center'}>
                    <p>{event.description}</p>
                </section>
            )}
            {moduleFlags.rsvp && (
                <section className={'mt-3 px-4'}>
                    <RsvpPrompt deadline={event?.schedule.rsvpDeadline ?? null} />
                </section>
            )}

            {/* Posts */}
            <section className={'mt-5'}>
                {moduleFlags.posts && (
                    <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
                        <ComposerCard />
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                        <div ref={loadMoreRef} className="h-1" />
                        {isFetchingNextPage && <p className="text-center text-sm text-ink-muted py-2">{t('loadingMore')}</p>}
                    </div>
                )}
            </section>
            {/* Deliberately outside moduleFlags.posts — a shared post link should
            still open even if the posts module is toggled off for this event.
            PostModal reads its own open state from the `?post=` param via
            usePostModal(). */}
            <PostModal />
        </div>
    );
}
