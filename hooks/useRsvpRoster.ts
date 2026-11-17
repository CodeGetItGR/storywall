'use client';

import { useMemo, useState } from 'react';

import { type RosterEntry, type RosterMember, type RosterRsvp, rsvpRoster } from '@/lib/rsvpGuests';
import { type RsvpDisplayStatus, rsvpStatusOrder } from '@/lib/statusTones';

export type { RosterEntry, RosterMember, RosterRsvp };

export type RosterFilter = 'all' | RsvpDisplayStatus;

/**
 * Guest roster for the RSVP list tab: live member guests and reply-only guests
 * (see rsvpRoster), each with their RSVP status. The counts double as the
 * filter control. Headcounts come from the RSVP report (useRsvpReport), not from here.
 */
export function useRsvpRoster(members: RosterMember[], rsvps: RosterRsvp[]) {
    const [filter, setFilter] = useState<RosterFilter>('all');

    const guests = useMemo(() => rsvpRoster(members, rsvps), [members, rsvps]);

    const counts = useMemo(
        () =>
            guests.reduce(
                (totals, guest) => {
                    totals[guest.status] += 1;
                    return totals;
                },
                { ATTENDING: 0, DECLINED: 0, NO_RESPONSE: 0 } as Record<RsvpDisplayStatus, number>,
            ),
        [guests],
    );

    const visibleGuests = useMemo(
        () =>
            guests
                .filter((guest) => filter === 'all' || guest.status === filter)
                .sort((left, right) => {
                    const orderDelta = rsvpStatusOrder[left.status] - rsvpStatusOrder[right.status];
                    return orderDelta !== 0 ? orderDelta : left.name.localeCompare(right.name);
                }),
        [filter, guests],
    );

    return { filter, setFilter, counts, guestCount: guests.length, visibleGuests };
}
