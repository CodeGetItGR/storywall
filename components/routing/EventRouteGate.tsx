'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type EventRouteGateContext = {
    activeEvent: EventDetailResponseDto;
    eventId: string;
    isHost: boolean;
};

type EventRouteGateProps = {
    children: (context: EventRouteGateContext) => ReactNode;
    missingEventRedirectTo?: string;
    requireHost?: boolean;
    guestRedirectTo?: string;
};

export function EventRouteGate({ children, missingEventRedirectTo, requireHost = false, guestRedirectTo }: EventRouteGateProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;
    const resolvedMissingEventRedirectTo = missingEventRedirectTo ?? (isAuthenticated ? routes.profile : routes.login);

    useEffect(() => {
        if (isContextLoading) return;

        if (!eventId) {
            router.replace(resolvedMissingEventRedirectTo);
            return;
        }

        if (requireHost && !isHost) {
            router.replace(guestRedirectTo ?? routes.post.feed(eventId));
        }
    }, [eventId, guestRedirectTo, isContextLoading, isHost, requireHost, resolvedMissingEventRedirectTo, router]);

    if (isContextLoading || !activeEvent || (requireHost && !isHost)) {
        return <EventRouteSpinner />;
    }

    return children({ activeEvent, eventId: activeEvent.id, isHost });
}

export function EventRouteSpinner() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        </div>
    );
}
