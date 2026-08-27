'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

type EventRouteContextValue = {
    activeEvent: EventDetailResponseDto;
    eventId: string;
    isHost: boolean;
};

const EventRouteContext = createContext<EventRouteContextValue | null>(null);

type EventRouteGateProps = {
    children: ReactNode;
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
    const resolvedMissingEventRedirectTo = missingEventRedirectTo ?? (isAuthenticated ? routes.home : routes.login);

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

    const value = { activeEvent, eventId: activeEvent.id, isHost };
    return <EventRouteContext.Provider value={value}>{children}</EventRouteContext.Provider>;
}

export function useEventRouteContext(): EventRouteContextValue {
    const context = useContext(EventRouteContext);
    if (!context) {
        throw new Error('useEventRouteContext must be used within an EventRouteGate');
    }
    return context;
}

export function EventRouteSpinner() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        </div>
    );
}
