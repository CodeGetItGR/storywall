'use client';

import { useCallback } from 'react';

import { useRsvp, useRsvpSessionResponses } from '@/hooks/useRsvps';
import { useMyVendorRole } from '@/hooks/useVendors';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { type SessionRsvpAnswer, sessionRsvpAnswer } from '@/lib/feedScheduleRsvp';
import { routes } from '@/lib/routes';
import { useActiveMember, useIsHost } from '@/providers/EventProvider';

export type FeedScheduleRsvpLink = { answer: SessionRsvpAnswer; href: string };

// Today's schedule's RSVP button, for a session that takes answers: the guest's answer, and the form's link.
// Null for whom the RSVP form isn't: hosts and co-hosts, vendors, or an event without RSVP and Schedule; and
// while the guest's RSVP is loading, so a button never turns into an answer under their thumb.
export function useFeedScheduleRsvp(event: Pick<EventDetailResponseDto, 'id' | 'modules'>): ((sessionId: string) => FeedScheduleRsvpLink) | null {
    const isHost = useIsHost();
    const member = useActiveMember();
    const asks = !isHost && member !== null && isModuleAvailable(event.modules, 'rsvp') && isModuleAvailable(event.modules, 'schedule');
    const vendorRole = useMyVendorRole(asks ? event.id : null);
    const rsvpId = asks ? member.rsvpId : null;
    const rsvp = useRsvp(rsvpId);
    const responses = useRsvpSessionResponses(rsvpId);

    const loading = vendorRole.isLoading || (rsvpId !== null && (rsvp.isLoading || responses.isLoading));
    const shows = asks && !loading && !vendorRole.data;
    const attendance = rsvp.data?.attendanceStatus ?? null;
    const answers = responses.data;
    const linkTo = useCallback(
        (sessionId: string): FeedScheduleRsvpLink => ({
            answer: sessionRsvpAnswer(attendance, answers ?? [], sessionId),
            href: routes.events.tools.rsvpSubmit(event.id, null, { session: sessionId }),
        }),
        [answers, attendance, event.id],
    );

    return shows ? linkTo : null;
}
