'use client';

import { useCallback, useMemo, useState } from 'react';

import { isRsvpGuest } from '@/lib/rsvpGuests';
import { type RsvpDisplayStatus, rsvpStatusOrder } from '@/lib/statusTones';

export type RosterMember = { id: string; displayName: string; role: string; deletedAt: string | null };
export type RosterRsvp = {
    eventMemberId: string;
    attendanceStatus: 'ATTENDING' | 'DECLINED';
    notes: string | null;
    adultCount: number;
    childCount: number;
};

export type RosterFilter = 'all' | RsvpDisplayStatus;

/**
 * Guest roster for the RSVP list tab: live guests (see isRsvpGuest), each with
 * their RSVP status. The counts double as the filter control. Headcounts come
 * from the RSVP report (useRsvpReport), not from here.
 */
export function useRsvpRoster(members: RosterMember[], rsvps: RosterRsvp[]) {
    const [filter, setFilter] = useState<RosterFilter>('all');

    const rsvpByMember = useMemo(() => new Map(rsvps.map((rsvp) => [rsvp.eventMemberId, rsvp])), [rsvps]);
    const guests = useMemo(() => members.filter(isRsvpGuest), [members]);

    const statusOf = useCallback(
        (memberId: string): RsvpDisplayStatus => rsvpByMember.get(memberId)?.attendanceStatus ?? 'NO_RESPONSE',
        [rsvpByMember],
    );

    const counts = useMemo(
        () =>
            guests.reduce(
                (totals, member) => {
                    totals[statusOf(member.id)] += 1;
                    return totals;
                },
                { ATTENDING: 0, DECLINED: 0, NO_RESPONSE: 0 } as Record<RsvpDisplayStatus, number>,
            ),
        [guests, statusOf],
    );

    const visibleGuests = useMemo(
        () =>
            guests
                .filter((member) => filter === 'all' || statusOf(member.id) === filter)
                .sort((left, right) => {
                    const orderDelta = rsvpStatusOrder[statusOf(left.id)] - rsvpStatusOrder[statusOf(right.id)];
                    return orderDelta !== 0 ? orderDelta : left.displayName.localeCompare(right.displayName);
                }),
        [filter, guests, statusOf],
    );

    return {
        filter,
        setFilter,
        counts,
        guestCount: guests.length,
        visibleGuests,
        rsvpByMember,
        statusOf,
    };
}
