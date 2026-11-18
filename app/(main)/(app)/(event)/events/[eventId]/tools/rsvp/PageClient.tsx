'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { RsvpRedirect } from '@/components/rsvp/RsvpRedirect';
import { RsvpPageSkeleton } from '@/components/rsvp/RsvpSkeletons';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export default function RSVPPage() {
    const activeEvent = useActiveEvent();

    return (
        <EventRouteGate
            requireHost
            guestRedirectTo={activeEvent ? routes.events.tools.rsvpSubmit(activeEvent.id) : undefined}
            fallback={<RsvpPageSkeleton />}
        >
            <RsvpRedirect />
        </EventRouteGate>
    );
}
