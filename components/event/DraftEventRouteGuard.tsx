'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost, useRouteEventId } from '@/providers/EventProvider';

export function DraftEventRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event: only a route that names the event may be redirected.
    const routeEventId = useRouteEventId();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isDraftHost = Boolean(routeEventId) && isHost && activeEvent?.status === 'DRAFT';
    const manageRoot = activeEvent ? routes.events.manage(activeEvent.id) : null;
    const checkoutRoot = activeEvent ? `/events/${activeEvent.id}/checkout/` : null;
    const isAllowedDraftRoute = pathname === manageRoot || (checkoutRoot !== null && pathname.startsWith(checkoutRoot));

    useEffect(() => {
        if (!isLoading && isDraftHost && !isAllowedDraftRoute && manageRoot) router.replace(manageRoot);
    }, [isAllowedDraftRoute, isDraftHost, isLoading, manageRoot, router]);

    if (isDraftHost && !isAllowedDraftRoute) return <EventRouteSpinner />;
    return children;
}
