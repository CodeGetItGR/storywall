'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

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

export function EventRouteGate({ children, missingEventRedirectTo = routes.profile, requireHost = false, guestRedirectTo }: EventRouteGateProps) {
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;

    useEffect(() => {
        if (isContextLoading) return;

        if (!eventId) {
            router.replace(missingEventRedirectTo);
            return;
        }

        if (requireHost && !isHost) {
            router.replace(guestRedirectTo ?? routes.post.feed(eventId));
        }
    }, [eventId, guestRedirectTo, isContextLoading, isHost, missingEventRedirectTo, requireHost, router]);

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
