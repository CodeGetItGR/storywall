'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRsvpAvailability } from '@/hooks/useRsvpAvailability';
import { routes } from '@/lib/routes';

// Tools > RSVP is no longer its own page (KAN-227): hosts go to the RSVP page in the
// dashboard. Without RSVP in the plan they stay, to see today's not-available screen.
export function useRsvpRedirect(eventId: string) {
    const router = useRouter();
    const availability = useRsvpAvailability();

    useEffect(() => {
        if (availability.isAvailable) router.replace(routes.events.manage(eventId, { tab: 'rsvp' }));
    }, [availability.isAvailable, eventId, router]);

    return availability;
}
