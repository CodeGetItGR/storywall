import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useRsvpAvailability } from '@/hooks/useRsvpAvailability';
import { useRsvpForm } from '@/hooks/useRsvpForm';
import { setMemberRsvpIdInCaches } from '@/hooks/useRsvps';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// A retry after an answers failure takes the PATCH path (effectiveRsvpId is
// already set), so the confirmation only needs to stay hidden while that
// failure is still showing on a brand-new RSVP.
export function computeShowConfirmation(submitted: boolean, hasExistingRsvp: boolean, hasSessionAnswersError: boolean): boolean {
    return submitted || (hasExistingRsvp && !hasSessionAnswersError);
}

export function useRsvpSubmitPageData() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const rsvpId = activeMember?.rsvpId ?? null;
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const rsvpAvailability = useRsvpAvailability();

    const presetAttending = searchParams.get('attending');
    const form = useRsvpForm({
        eventId,
        eventStatus: activeEvent?.status,
        modules: activeEvent?.modules,
        memberId,
        rsvpId,
        isAvailable: rsvpAvailability.isAvailable,
        initialAttending: presetAttending === 'attending' || presetAttending === 'not-attending' ? presetAttending : null,
    });
    const { isStaleRsvp } = form;

    useEffect(() => {
        if (!isContextLoading && isHost && eventId) {
            router.replace(routes.events.tools.rsvp(eventId));
        }
    }, [eventId, isContextLoading, isHost, router]);

    useEffect(() => {
        if (!eventId || !memberId || !isStaleRsvp || !rsvpId) {
            return;
        }

        setMemberRsvpIdInCaches(queryClient, memberId, null, eventId);
        router.refresh();
    }, [eventId, isStaleRsvp, memberId, queryClient, rsvpId, router]);

    // Members cannot access the host-only RSVP overview. Sending them there makes the
    // route gate redirect straight back to this form, leaving the Back control stuck.
    const backHref = eventId ? routes.events.feed(eventId) : routes.feed;

    const handleBackToWall = useCallback(() => {
        router.push(eventId ? routes.events.feed(eventId) : routes.feed);
    }, [eventId, router]);

    return {
        ...form,
        backHref,
        eventId,
        eventType: activeEvent?.eventType ?? null,
        onBackToWall: handleBackToWall,
        rsvpAvailability,
    };
}
