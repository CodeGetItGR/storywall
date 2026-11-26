'use client';

import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { useExpectedFeedMode } from '@/hooks/useFeedMode';
import { useActiveEvent, useRouteEventId } from '@/providers/EventProvider';

// The feed's loading state on the way in: no header when the page will open on the invitation.
export function FeedRouteLoading() {
    const activeEvent = useActiveEvent();
    const routeEventId = useRouteEventId();
    const mode = useExpectedFeedMode(activeEvent?.id === routeEventId ? activeEvent : null);

    if (mode === null) return <FeedPageSkeleton />;
    return <FeedPageSkeleton header={mode === 'invitation' ? 'hidden' : 'shown'} />;
}
