'use client';

import { useCallback, useMemo, useState } from 'react';

import { type RsvpDisplayStatus, rsvpStatusOrder } from '@/lib/statusTones';

export type RosterMember = { id: string; displayName: string; role: string };
export type RosterRsvp = {
    eventMemberId: string;
    attendanceStatus: 'ATTENDING' | 'DECLINED';
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
                { ATTENDING: 0, DECLINED: 0, NO_RESPONSE: 0 } as Record<RsvpDisplayStatus, number>
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

    // Adult/child counts only mean anything for guests who are actually attending —
    // a declined or unanswered RSVP carries no reliable headcount, so it's excluded
    // rather than summed in as if it were people confirmed to attend.
    const attendingRsvps = useMemo(() => rsvps.filter((rsvp) => rsvp.attendanceStatus === 'ATTENDING'), [rsvps]);
    const adultsTotal = useMemo(() => attendingRsvps.reduce((sum, rsvp) => sum + rsvp.adultCount, 0), [attendingRsvps]);
    const kidsTotal = useMemo(() => attendingRsvps.reduce((sum, rsvp) => sum + rsvp.childCount, 0), [attendingRsvps]);
    const peopleGoing = adultsTotal + kidsTotal;

    // Guests who declined or never responded don't have a known headcount, so each
    // one only counts as one person, not their (unknown) family size.
    const peopleNotGoing = counts.DECLINED + counts.NO_RESPONSE;

    return {
        filter,
        setFilter,
        counts,
        guestCount: guests.length,
        responseCount: counts.ATTENDING + counts.DECLINED,
        seatsClaimed: peopleGoing,
        adultsTotal,
        kidsTotal,
        peopleGoing,
        peopleNotGoing,
        visibleGuests,
        rsvpByMember,
        statusOf,
    };
}
