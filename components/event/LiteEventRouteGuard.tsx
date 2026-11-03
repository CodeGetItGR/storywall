'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { eventHomeHref, isLiteEvent, isLiteEventRouteAllowed } from '@/lib/liteEvents';
import { useActiveEvent, useEventContextLoading, useIsHost, useRouteEventId } from '@/providers/EventProvider';

// A lite event (no feed in its plan) has only its gallery and/or wishbook, manage and checkout, so its hosts
// land on the home page from anywhere else: the feed, guest invitations and every other tool. Drafts and
// deleted events keep their own guards. Sibling of DeletedEventRouteGuard.
export function LiteEventRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event: only a route that names the event may be redirected.
    const routeEventId = useRouteEventId();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isLiveLiteHost =
        Boolean(routeEventId) && isHost && isLiteEvent(activeEvent) && activeEvent?.status !== 'DRAFT' && !isEventDeleted(activeEvent);
    const home = activeEvent ? eventHomeHref(activeEvent) : null;
    const isAllowed = activeEvent ? isLiteEventRouteAllowed(pathname, activeEvent) : true;

    useEffect(() => {
        if (!isLoading && isLiveLiteHost && !isAllowed && home) router.replace(home);
    }, [home, isAllowed, isLiveLiteHost, isLoading, router]);

    if (!isLoading && isLiveLiteHost && !isAllowed) return <EventRouteSpinner />;
    return children;
}
