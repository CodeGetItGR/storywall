import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type RosterMember, type RosterRsvp, useRsvpRoster } from '@/hooks/useRsvpRoster';

const members: RosterMember[] = [
    { id: 'a', displayName: 'Anna', role: 'ATTENDEE', deletedAt: null },
    { id: 'h', displayName: 'Host', role: 'HOST', deletedAt: null },
    { id: 'r', displayName: 'Removed', role: 'ATTENDEE', deletedAt: '2026-09-20T10:00:00Z' },
    { id: 's', displayName: 'Silent', role: 'ATTENDEE', deletedAt: null },
];
const rsvps: RosterRsvp[] = [
    { id: 'rsvp-a', eventMemberId: 'a', attendanceStatus: 'ATTENDING', notes: null, adultCount: 1, childCount: 0 },
    { id: 'rsvp-r', eventMemberId: 'r', attendanceStatus: 'DECLINED', notes: null, adultCount: 0, childCount: 0 },
];
const fromInvitation: RosterRsvp[] = [
    { id: 'rsvp-m', eventMemberId: 'm', attendanceStatus: 'DECLINED', notes: null, adultCount: 0, childCount: 0, replyOnly: true, guestName: 'Maria' },
    { id: 'rsvp-b', eventMemberId: 'b', attendanceStatus: 'ATTENDING', notes: null, adultCount: 2, childCount: 0, replyOnly: true, guestName: 'Babis' },
];

describe('useRsvpRoster', () => {
    it('lists live guests only', () => {
        const { result } = renderHook(() => useRsvpRoster(members, rsvps));

        expect(result.current.visibleGuests.map((m) => m.id)).toEqual(['a', 's']);
        expect(result.current.guestCount).toBe(2);
        expect(result.current.counts).toEqual({ ATTENDING: 1, DECLINED: 0, NO_RESPONSE: 1 });
    });

    it('lists reply-only guests with member guests, counted once each, sorted by status then name', () => {
        const { result } = renderHook(() => useRsvpRoster(members, [...rsvps, ...fromInvitation]));

        expect(result.current.visibleGuests.map((guest) => guest.name)).toEqual(['Anna', 'Babis', 'Maria', 'Silent']);
        expect(result.current.guestCount).toBe(4);
        expect(result.current.counts).toEqual({ ATTENDING: 2, DECLINED: 1, NO_RESPONSE: 1 });
    });

    it('filters reply-only guests like everyone else', () => {
        const { result } = renderHook(() => useRsvpRoster(members, [...rsvps, ...fromInvitation]));
        act(() => result.current.setFilter('DECLINED'));
        expect(result.current.visibleGuests.map((guest) => guest.name)).toEqual(['Maria']);
    });
});
