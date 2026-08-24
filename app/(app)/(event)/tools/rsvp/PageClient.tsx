'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { RsvpScreen } from '@/components/rsvp/RsvpScreen';
import { routes } from '@/lib/routes';

export default function RSVPPage() {
    return (
        <EventRouteGate requireHost guestRedirectTo={routes.tools.rsvpSubmit}>
            <RsvpScreen />
        </EventRouteGate>
    );
}
