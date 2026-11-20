'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { RsvpPageSkeleton } from '@/components/rsvp/RsvpSkeletons';
import { RsvpUnavailableState } from '@/components/rsvp/RsvpUnavailableState';
import { useRsvpRedirect } from '@/hooks/useRsvpRedirect';

// What /tools/rsvp shows a host: the not-available screen, or a skeleton for the moment before the redirect.
export function RsvpRedirect() {
    const { eventId } = useEventRouteContext();
    const rsvp = useRsvpRedirect(eventId);

    if (!rsvp.isAvailable) return <RsvpUnavailableState eventId={eventId} title={rsvp.unavailableTitle} body={rsvp.unavailableBody} />;
    return <RsvpPageSkeleton />;
}
