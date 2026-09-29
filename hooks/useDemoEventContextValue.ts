'use client';

import { useMemo } from 'react';

import { useEvent } from '@/hooks/useEvent';
import type { DemoSession } from '@/lib/demo/demoSession';
import type { EventContextValue } from '@/providers/EventProvider';

export function useDemoEventContextValue(session: DemoSession): EventContextValue {
    // Served by the local mock, so settings the visitor changes show up here too.
    const { data: event } = useEvent(session.eventId);

    return useMemo(() => {
        const activeMember = session.db.get('members', session.viewerMemberId) ?? null;
        return {
            memberships: activeMember ? [activeMember] : [],
            routeEventId: session.eventId,
            activeEvent: event ?? session.db.get('events', session.eventId) ?? null,
            activeMember,
            isHost: true,
            isLoading: false,
        };
    }, [event, session]);
}
