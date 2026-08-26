'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { useEventPosts } from '@/hooks';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { setMemberRsvpIdInCaches, useRsvp } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { EVENT_MODULE_KEYS, type ModuleKeyConvention } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveMember, useEventSwitcher, useIsHost } from '@/providers/EventProvider';

import { FeedPageContent } from './FeedPageContent';
import { FeedPageProvider } from './FeedPageContext';

export function FeedPageBoundary({ eventId }: { eventId: string }) {
    const t = useTranslations('FeedPage');
    const router = useRouter();
    const queryClient = useQueryClient();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const currentMemberRsvpId = activeMember?.rsvpId ?? null;
    const { data: appConfig } = useAppConfig();

    const { data: event, error, isLoading } = useEvent(eventId);
    const { setActiveEventId } = useEventSwitcher();
    const { data: postPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(eventId);
    const posts = useMemo(() => postPages?.pages.flatMap((page) => page.content) ?? [], [postPages?.pages]);
    const loadMoreRef = useInfiniteScrollSentinel(hasNextPage, fetchNextPage, posts.length);

    useEffect(() => {
        if (event) setActiveEventId(eventId);
    }, [event, eventId, setActiveEventId]);

    useEffect(() => {
        if (!isLoading && (!event || (error instanceof ApiError && error.status === 404))) {
            router.replace(routes.eventNotFound);
        }
    }, [error, event, isLoading, router]);

    const { error: submittedRsvpError } = useRsvp(currentMemberRsvpId ?? null);
    const isStaleRsvp = submittedRsvpError instanceof ApiError && submittedRsvpError.status === 404;

    useEffect(() => {
        if (!currentMemberRsvpId || !isStaleRsvp) {
            return;
        }

        if (activeMember) {
            setMemberRsvpIdInCaches(queryClient, activeMember.id, null, eventId);
        }
        router.refresh();
    }, [activeMember, currentMemberRsvpId, eventId, isStaleRsvp, queryClient, router]);

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
        return null;
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
                currentMemberRsvpId,
            }}
        >
            <FeedPageContent />
        </FeedPageProvider>
    );
}
