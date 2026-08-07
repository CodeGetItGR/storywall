'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef } from 'react';

import { Banner } from '@/components/feed/Banner';
import { ComposerCard } from '@/components/feed/ComposerCard';
import { EventDescription } from '@/components/feed/EventDescription';
import { EventInfo } from '@/components/feed/EventInfo';
import { EventNotFound } from '@/components/feed/EventNotFound';
import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { Header } from '@/components/feed/Header';
import { PostModal } from '@/components/feed/PostModal';
import { RsvpPrompt } from '@/components/feed/RsvpPrompt';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { useEventPosts } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { EVENT_MODULE_KEYS, ModuleKeyConvention } from '@/lib/api/types';
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
    const { data: appConfig } = useAppConfig();

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

    const moduleFlags = useMemo<Record<ModuleKeyConvention, boolean>>(() => {
        const registryKeys = new Set(appConfig?.eventModuleKeys ?? EVENT_MODULE_KEYS);
        const defaults = Object.fromEntries(EVENT_MODULE_KEYS.map((key) => [key, false])) as Record<ModuleKeyConvention, boolean>;

        if (!event) {
            return defaults;
        }

        return {
            ...defaults,
            ...Object.fromEntries(
                event.modules.filter(({ moduleKey }) => registryKeys.has(moduleKey)).map(({ moduleKey, isAvailable }) => [moduleKey, isAvailable])
            ),
        } as Record<ModuleKeyConvention, boolean>;
    }, [appConfig?.eventModuleKeys, event]);

    if (isLoading) {
        return <FeedPageSkeleton />;
    }

    if (!event || (error instanceof ApiError && error.status === 404)) {
        return <EventNotFound />;
    }

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-2xl">
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
            {/*<QuickAccessBar />*/}

            {/* Event description */}
            {event.description && <EventDescription eventId={event.id} description={event.description} />}

            {moduleFlags.rsvp && !isHost && storedRsvpId === null && (
                <section className="">
                    <RsvpPrompt deadline={event?.schedule.rsvpDeadline ?? null} />
                </section>
            )}

            {/* Posts */}
            <section id="posts">
                {moduleFlags.posts && (
                    <div className="flex flex-col px-0 pb-24 lg:pb-10">
                        <ComposerCard />
                        <div className="flex flex-col">
                            {posts.map((post, index) => (
                                <FeedPostRenderer key={post.id} post={post} isLcpCandidate={index === 0} />
                            ))}
                            <div ref={loadMoreRef} className="h-1" />
                            {isFetchingNextPage && <p className="py-2 text-center text-sm text-ink-muted">{t('loadingMore')}</p>}
                        </div>
                    </div>
                )}
            </section>
            {/* Deliberately outside moduleFlags.posts a shared post link should
            still open even if the posts module is toggled off for this event.
            PostModal reads its own open state from the `?post=` param via
            usePostModal(). */}
            <PostModal />
        </div>
    );
}
