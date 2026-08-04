'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef } from 'react';

import { Banner, ComposerCard, EventDescription, EventInfo, EventNotFound, FeedPageSkeleton, Header, PostCard, PostModal, QuickAccessBar, RsvpPrompt, StoriesRow } from '@/components/feed';
import { useEventPosts } from '@/hooks';
import { useEvent } from '@/hooks/useEvent';
import { useRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { ModuleKeyConvention } from '@/lib/api/types';
import { rsvpStorageKey } from '@/lib/storageKeys';
import { useActiveMember, useEventSwitcher, useIsHost } from '@/providers/EventProvider';

export default function FeedPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const t = useTranslations('FeedPage');
    const router = useRouter();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const memberId = activeMember?.id ?? null;

    const { data: event, error, isLoading } = useEvent(eventId);
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

    const storedRsvpId = useMemo(() => {
        if (!memberId || typeof window === 'undefined') {
            return undefined;
        }

        return window.localStorage.getItem(rsvpStorageKey(memberId));
    }, [memberId]);

    const { error: submittedRsvpError } = useRsvp(storedRsvpId ?? null);
    const isStaleRsvp = submittedRsvpError instanceof ApiError && submittedRsvpError.status === 404;

    useEffect(() => {
        if (!memberId || !isStaleRsvp || !storedRsvpId) {
            return;
        }

        window.localStorage.removeItem(rsvpStorageKey(memberId));
        router.refresh();
    }, [isStaleRsvp, memberId, router, storedRsvpId]);

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

    if (isLoading) {
        return <FeedPageSkeleton />;
    }

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
                <section id="stories" className="top-0 bg-background/90 backdrop-blur-sm border-b border-border">
                    <StoriesRow eventId={eventId} />
                </section>
            )}

            {/* Guest quick access bar. */}
            <QuickAccessBar />

            {/* Event description */}
            {event.description && <EventDescription eventId={event.id} description={event.description} />}
            {moduleFlags.rsvp && !isHost && storedRsvpId === null && (
                <section className="mt-3 px-4">
                    <RsvpPrompt deadline={event?.schedule.rsvpDeadline ?? null} />
                </section>
            )}

            {/* Posts */}
            <section id="posts" className={'mt-5'}>
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
