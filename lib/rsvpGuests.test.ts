import { describe, expect, it } from 'vitest';

import { attendingGuestPeople, isRsvpGuest } from '@/lib/rsvpGuests';

const guest = { id: 'g', role: 'ATTENDEE', deletedAt: null };
const host = { id: 'h', role: 'HOST', deletedAt: null };
const removed = { id: 'r', role: 'ATTENDEE', deletedAt: '2026-09-20T10:00:00Z' };

function rsvp(eventMemberId: string, attendanceStatus: 'ATTENDING' | 'DECLINED', adultCount: number, childCount: number) {
    return { eventMemberId, attendanceStatus, adultCount, childCount };
}

describe('isRsvpGuest', () => {
    it('is a live attendee, like the backend counts', () => {
        expect(isRsvpGuest(guest)).toBe(true);
        expect(isRsvpGuest(host)).toBe(false);
        expect(isRsvpGuest(removed)).toBe(false);
    });
});

describe('attendingGuestPeople', () => {
    it('sums attending guests only', () => {
        const rsvps = [
            rsvp('g', 'ATTENDING', 2, 1),
            rsvp('h', 'ATTENDING', 2, 0), // host
            rsvp('r', 'ATTENDING', 1, 0), // removed
        ];

        expect(attendingGuestPeople([guest, host, removed], rsvps)).toBe(3);
    });

    it('leaves declined guests out', () => {
        expect(attendingGuestPeople([guest], [rsvp('g', 'DECLINED', 1, 0)])).toBe(0);
    });
});
