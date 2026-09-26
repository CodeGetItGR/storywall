import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';

const members: RosterMember[] = [
    { id: 'a', displayName: 'Anna', role: 'ATTENDEE', deletedAt: null },
    { id: 'h', displayName: 'Host', role: 'HOST', deletedAt: null },
    { id: 'r', displayName: 'Removed', role: 'ATTENDEE', deletedAt: '2026-09-20T10:00:00Z' },
    { id: 's', displayName: 'Silent', role: 'ATTENDEE', deletedAt: null },
];
const rsvps: RosterRsvp[] = [
    { eventMemberId: 'a', attendanceStatus: 'ATTENDING', notes: null, adultCount: 1, childCount: 0 },
    { eventMemberId: 'r', attendanceStatus: 'DECLINED', notes: null, adultCount: 0, childCount: 0 },
];

describe('useRsvpRoster', () => {
    it('lists live guests only', () => {
        const { result } = renderHook(() => useRsvpRoster(members, rsvps));

        expect(result.current.visibleGuests.map((m) => m.id)).toEqual(['a', 's']);
        expect(result.current.guestCount).toBe(2);
        expect(result.current.counts).toEqual({ ATTENDING: 1, DECLINED: 0, NO_RESPONSE: 1 });
    });
});
