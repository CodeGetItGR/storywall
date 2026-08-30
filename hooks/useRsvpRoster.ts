'use client';

import { useCallback, useMemo, useState } from 'react';

import { type RsvpDisplayStatus, rsvpStatusOrder } from '@/lib/statusTones';

export type RosterMember = { id: string; displayName: string; role: string };
export type RosterRsvp = {
    eventMemberId: string;
    attendanceStatus: 'ATTENDING' | 'DECLINED' | 'MAYBE';
    notes: string | null;
    adultCount: number;
    childCount: number;
};

export type RosterFilter = 'all' | RsvpDisplayStatus;

/**
 * Guest roster for the RSVP section: the counts double as the filter control,
 * so the same numbers are never printed twice as a separate stat block.
 */
export function useRsvpRoster(members: RosterMember[], rsvps: RosterRsvp[]) {
    const [filter, setFilter] = useState<RosterFilter>('all');

    const rsvpByMember = useMemo(() => new Map(rsvps.map((rsvp) => [rsvp.eventMemberId, rsvp])), [rsvps]);
    const guests = useMemo(() => members.filter((member) => member.role !== 'HOST'), [members]);

    const statusOf = useCallback(
        (memberId: string): RsvpDisplayStatus => rsvpByMember.get(memberId)?.attendanceStatus ?? 'NO_RESPONSE',
        [rsvpByMember]
    );

    const counts = useMemo(
        () =>
            guests.reduce(
                (totals, member) => {
                    totals[statusOf(member.id)] += 1;
                    return totals;
                },
                { ATTENDING: 0, MAYBE: 0, DECLINED: 0, NO_RESPONSE: 0 } as Record<RsvpDisplayStatus, number>
            ),
        [guests, statusOf]
    );

    const visibleGuests = useMemo(
        () =>
            guests
                .filter((member) => filter === 'all' || statusOf(member.id) === filter)
                .sort((left, right) => {
                    const orderDelta = rsvpStatusOrder[statusOf(left.id)] - rsvpStatusOrder[statusOf(right.id)];
                    return orderDelta !== 0 ? orderDelta : left.displayName.localeCompare(right.displayName);
                }),
        [filter, guests, statusOf]
    );

    const adultsTotal = useMemo(() => rsvps.reduce((sum, rsvp) => sum + rsvp.adultCount, 0), [rsvps]);
    const kidsTotal = useMemo(() => rsvps.reduce((sum, rsvp) => sum + rsvp.childCount, 0), [rsvps]);

    // Counted in people (adults + kids), not responses, so it answers "how many
    // are actually coming" rather than "how many parties replied".
    const peopleByStatus = useMemo(
        () =>
            rsvps.reduce(
                (totals, rsvp) => {
                    totals[rsvp.attendanceStatus] += rsvp.adultCount + rsvp.childCount;
                    return totals;
                },
                { ATTENDING: 0, MAYBE: 0, DECLINED: 0 } as Record<'ATTENDING' | 'MAYBE' | 'DECLINED', number>
            ),
        [rsvps]
    );

    return {
        filter,
        setFilter,
        counts,
        guestCount: guests.length,
        responseCount: counts.ATTENDING + counts.MAYBE + counts.DECLINED,
        seatsClaimed: rsvps.reduce((sum, rsvp) => sum + rsvp.adultCount + rsvp.childCount, 0),
        adultsTotal,
        kidsTotal,
        peopleByStatus,
        visibleGuests,
        rsvpByMember,
        statusOf,
    };
}
