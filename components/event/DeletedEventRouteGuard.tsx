'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { isDeletedEventRouteAllowed, isEventDeleted } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// A deleted event is read-only for its hosts and 404s for everyone else, so
// only manage, gallery and wishbook stay reachable; anything else lands on
// the manage page's deletion banner. Sibling of DraftEventRouteGuard.
export function DeletedEventRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isDeletedHost = isHost && isEventDeleted(activeEvent);
    const manageRoot = activeEvent ? routes.events.manage(activeEvent.id) : null;
    const isAllowed = activeEvent ? isDeletedEventRouteAllowed(pathname, activeEvent.id) : true;

    useEffect(() => {
        if (!isLoading && isDeletedHost && !isAllowed && manageRoot) router.replace(manageRoot);
    }, [isAllowed, isDeletedHost, isLoading, manageRoot, router]);

    if (isDeletedHost && !isAllowed) return <EventRouteSpinner />;
    return children;
}
