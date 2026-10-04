'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRsvpForm } from '@/hooks/useRsvpForm';
import { setMemberRsvpIdInCaches } from '@/hooks/useRsvps';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { useActiveEvent } from '@/providers/EventProvider';

// The guest RSVP form, answered by the admin for a demo persona. Closes once saved.
export function useDemoPersonaRsvp({ eventId, member, onDoneAction }: { eventId: string; member: EventMemberResponseDto; onDoneAction: () => void }) {
    const queryClient = useQueryClient();
    const activeEvent = useActiveEvent();
    const form = useRsvpForm({
        eventId,
        eventStatus: activeEvent?.status,
        modules: activeEvent?.modules,
        memberId: member.id,
        rsvpId: member.rsvpId ?? null,
        isAvailable: isModuleAvailable(activeEvent?.modules, 'rsvp'),
    });
    const { isStaleRsvp, submitted } = form;

    // An RSVP deleted elsewhere: forget it so the form creates a new one.
    useEffect(() => {
        if (isStaleRsvp) setMemberRsvpIdInCaches(queryClient, member.id, null, eventId);
    }, [eventId, isStaleRsvp, member.id, queryClient]);

    useEffect(() => {
        if (submitted) onDoneAction();
    }, [onDoneAction, submitted]);

    return { ...form, eventType: activeEvent?.eventType ?? null };
}
