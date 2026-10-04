'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { SuspendedEventBilling } from '@/components/event/SuspendedEventBilling';
import { SuspendedEventView } from '@/components/event/SuspendedEventView';
import { useActiveEvent, useRouteEventId } from '@/providers/EventProvider';

// ?view=billing on any event URL: the primary host's billing-and-withdrawal mode of the suspended view.
const SUSPENDED_BILLING_VIEW = 'billing';

// Only a host ever receives a suspended event (everyone else gets 404), so a suspended active
// event means: show the host why, and nothing else. Outermost of the event route guards, so a
// closed StoryWall (suspended and soft-deleted) shows this view, not the deleted-event one.
export function SuspendedEventRouteGuard({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id], /home) fall back to the last visited event: only a route that names the event may be replaced.
    const routeEventId = useRouteEventId();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    if (!routeEventId || !activeEvent?.suspended) return children;

    // The server decides who may read billing; this only decides what to show. A co-host who types
    // ?view=billing just gets the suspended view.
    const primaryHost = activeEvent.suspension?.primaryHost === true;
    if (primaryHost && searchParams.get('view') === SUSPENDED_BILLING_VIEW) {
        return <SuspendedEventBilling event={activeEvent} backHref={pathname} />;
    }
    return <SuspendedEventView event={activeEvent} billingHref={primaryHost ? `${pathname}?view=${SUSPENDED_BILLING_VIEW}` : null} />;
}
