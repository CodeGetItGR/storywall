'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvent';
import { useMyEvents } from '@/hooks/useMyEvents';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';

const ACTIVE_EVENT_KEY = 'storywall.activeEventId';
const EMPTY_MEMBERSHIPS: EventMemberResponseDto[] = [];

interface EventContextValue {
    memberships: EventMemberResponseDto[];
    activeEvent: EventDetailResponseDto | null;
    activeMember: EventMemberResponseDto | null;
    isHost: boolean;
    isLoading: boolean;
    setActiveEventId: (eventId: string) => void;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const { data: memberships = EMPTY_MEMBERSHIPS, isLoading: isLoadingMemberships } = useMyEvents();
    const [activeEventId, setActiveEventIdState] = useState<string | null>(null);

    // Restore the last-active event whenever memberships load or change,
    // defaulting to the first membership when nothing was previously selected
    // or the stored id no longer matches any membership. Kept in an effect so
    // render stays pure.
    useEffect(() => {
        if (memberships.length === 0) {
            if (activeEventId !== null) setActiveEventIdState(null);
            return;
        }

        if (activeEventId && memberships.some((m) => m.eventId === activeEventId)) {
            return;
        }

        const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(ACTIVE_EVENT_KEY) : null;
        const restored = memberships.find((m) => m.eventId === stored)?.eventId ?? memberships[0].eventId;

        setActiveEventIdState((current) => (current === restored ? current : restored));
    }, [activeEventId, memberships]);

    function setActiveEventId(eventId: string) {
        setActiveEventIdState(eventId);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(ACTIVE_EVENT_KEY, eventId);
        }
    }

    const { data: activeEvent, isLoading: isLoadingEvent } = useEvent(activeEventId);

    const activeMember = useMemo(() => memberships.find((m) => m.eventId === activeEventId) ?? null, [memberships, activeEventId]);

    const value: EventContextValue = {
        memberships,
        activeEvent: activeEvent ?? null,
        activeMember,
        isHost: activeMember?.role === 'HOST',
        isLoading: isAuthenticated && (isLoadingMemberships || (Boolean(activeEventId) && isLoadingEvent)),
        setActiveEventId,
    };

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

export function useEventSwitcher() {
    const { memberships, activeEvent, setActiveEventId, isLoading } = useEventContext();
    return { memberships, activeEvent, setActiveEventId, isLoading };
}
