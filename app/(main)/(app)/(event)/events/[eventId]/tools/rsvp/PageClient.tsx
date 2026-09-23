'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { RsvpScreen } from '@/components/rsvp/RsvpScreen';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export default function RSVPPage() {
    const activeEvent = useActiveEvent();

    return (
        <EventRouteGate requireHost guestRedirectTo={activeEvent ? routes.events.tools.rsvpSubmit(activeEvent.id) : undefined}>
            <RsvpScreen />
        </EventRouteGate>
    );
}
