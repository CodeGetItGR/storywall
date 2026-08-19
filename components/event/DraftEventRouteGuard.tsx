'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export function DraftEventRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isDraftHost = isHost && activeEvent?.status === 'DRAFT';
    const checkoutRoot = activeEvent ? `/events/${activeEvent.id}/checkout/` : null;
    const isAllowedDraftRoute = pathname === routes.manage || (checkoutRoot !== null && pathname.startsWith(checkoutRoot));

    useEffect(() => {
        if (!isLoading && isDraftHost && !isAllowedDraftRoute) router.replace(routes.manage);
    }, [isAllowedDraftRoute, isDraftHost, isLoading, router]);

    if (isDraftHost && !isAllowedDraftRoute) return <EventRouteSpinner />;
    return children;
}
