'use client';

import { usePathname } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvent';
import { useMyEvents } from '@/hooks/useMyEvents';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { getActiveEventCookie, setActiveEventCookie } from '@/lib/storageKeys';

const EMPTY_MEMBERSHIPS: EventMemberResponseDto[] = [];

// Matches the eventId segment of any event-scoped route (/events/:id/feed,
// /events/:id/manage, /events/:id/tools/*, /events/:id/story/*,
// /events/:id/checkout/*, /events/:id/settings/*) — every page that renders
// event-specific content carries its event id in the URL, so this is the
// single source of truth for "which event is active" rather than a value
// that only a handful of pages remembered to keep in sync. `/events/new`
// is excluded — that segment is a literal route, not an event id.
function urlEventId(pathname: string): string | null {
    return pathname.match(/^\/events\/(?!new(?:\/|$))([^/]+)/)?.[1] ?? null;
}

export interface EventContextValue {
    memberships: EventMemberResponseDto[];
    activeEvent: EventDetailResponseDto | null;
    activeMember: EventMemberResponseDto | null;
    isHost: boolean;
    isLoading: boolean;
}

export const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const { data: memberships = EMPTY_MEMBERSHIPS, isLoading: isLoadingMemberships } = useMyEvents();
    const routeEventId = urlEventId(pathname);

    // Fallback only for chrome that needs to point at "your event" while on
    // a page with no event id in the URL at all (nav rail Home link, mobile
    // tab bar home tab) — restored from the last event a URL actually named.
    const [lastEventId, setLastEventId] = useState<string | null>(null);

    useEffect(() => {
        // The route is authoritative when it names an event — this fallback only
        // matters for id-less chrome pages, so it must not fight the other effect
        // over lastEventId while a route event id is present (that fight is what
        // caused an infinite update loop while memberships were still loading).
        if (routeEventId) return;

        if (memberships.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync derived fallback once async memberships settle.
            if (lastEventId !== null) setLastEventId(null);
            return;
        }

        if (lastEventId) return;

        const stored = getActiveEventCookie();
        setLastEventId(memberships.find((m) => m.eventId === stored)?.eventId ?? memberships[0].eventId);
    }, [routeEventId, lastEventId, memberships]);

    // Whenever the URL names an event, persist it as the fallback too (and
    // to the cookie) — so id-less chrome pages and the bare-path redirect
    // stubs (resolved server-side from this same cookie) point at whatever
    // event was last actually visited.
    useEffect(() => {
        if (!routeEventId) return;
        setActiveEventCookie(routeEventId);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Only updates when the route's event actually changed.
        if (routeEventId !== lastEventId) setLastEventId(routeEventId);
    }, [routeEventId, lastEventId]);

    const activeEventId = routeEventId ?? lastEventId;

    const { data: activeEvent, isLoading: isLoadingEvent } = useEvent(activeEventId);

    const activeMember = useMemo(() => memberships.find((m) => m.eventId === activeEventId) ?? null, [memberships, activeEventId]);

    const isHost = activeMember?.role === 'HOST';
    const isLoading = isAuthenticated && (isLoadingMemberships || (Boolean(activeEventId) && isLoadingEvent));

    const value: EventContextValue = useMemo(
        () => ({
            memberships,
            activeEvent: activeEvent ?? null,
            activeMember,
            isHost,
            isLoading,
        }),
        [memberships, activeEvent, activeMember, isHost, isLoading]
    );

    return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

function useEventContext(): EventContextValue {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEventContext must be used within an EventProvider');
    }
    return context;
}

export function useActiveEvent(): EventDetailResponseDto | null {
    return useEventContext().activeEvent;
}

export function useActiveMember(): EventMemberResponseDto | null {
    return useEventContext().activeMember;
}

export function useMyMemberships(): EventMemberResponseDto[] {
    return useEventContext().memberships;
}

export function useIsHost(): boolean {
    return useEventContext().isHost;
}

export function useEventContextLoading(): boolean {
    return useEventContext().isLoading;
}
