'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

import { EventNotFound } from '@/components/feed/EventNotFound';
import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { useEventPosts } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { EVENT_MODULE_KEYS, type ModuleKeyConvention } from '@/lib/api/types';
import { rsvpStorageKey } from '@/lib/storageKeys';
import { useActiveMember, useEventSwitcher, useIsHost } from '@/providers/EventProvider';

import { FeedPageContent } from './FeedPageContent';
import { FeedPageProvider } from './FeedPageContext';

export function FeedPageBoundary({ eventId }: { eventId: string }) {
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

    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel || !hasNextPage) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) fetchNextPage();
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, posts.length]);

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
        const registryKeys = new Set(
            appConfig?.modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey) ?? EVENT_MODULE_KEYS
        );
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
    }, [appConfig?.modules, event]);

    if (isLoading) {
        return <FeedPageSkeleton />;
    }

    if (!event || (error instanceof ApiError && error.status === 404)) {
        return <EventNotFound />;
    }

    return (
        <FeedPageProvider
            value={{
                event,
                eventId,
                isFetchingNextPage,
                isHost,
                loadMoreRef,
                loadingMoreLabel: t('loadingMore'),
                moduleFlags,
                posts,
                storedRsvpId,
            }}
        >
            <FeedPageContent />
        </FeedPageProvider>
    );
}
