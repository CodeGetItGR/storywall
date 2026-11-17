import { describe, expect, it } from 'vitest';

import { attendingGuestPeople, isRsvpGuest, type RosterRsvp, rsvpRoster } from '@/lib/rsvpGuests';

const guest = { id: 'g', displayName: 'Anna', role: 'ATTENDEE', deletedAt: null };
const host = { id: 'h', displayName: 'Host', role: 'HOST', deletedAt: null };
const removed = { id: 'r', displayName: 'Removed', role: 'ATTENDEE', deletedAt: '2026-09-20T10:00:00Z' };

function rsvp(eventMemberId: string, attendanceStatus: 'ATTENDING' | 'DECLINED', adultCount: number, childCount: number, extra: Partial<RosterRsvp> = {}) {
    return { id: `rsvp-${eventMemberId}`, eventMemberId, attendanceStatus, adultCount, childCount, notes: null, ...extra };
}

const replyOnly = (eventMemberId: string, guestName: string, attendanceStatus: 'ATTENDING' | 'DECLINED', adultCount = 0, childCount = 0) =>
    rsvp(eventMemberId, attendanceStatus, adultCount, childCount, { replyOnly: true, guestName });

describe('isRsvpGuest', () => {
    it('is a live attendee, like the backend counts', () => {
        expect(isRsvpGuest(guest)).toBe(true);
        expect(isRsvpGuest(host)).toBe(false);
        expect(isRsvpGuest(removed)).toBe(false);
    });
});

describe('rsvpRoster', () => {
    it('lists member guests with their replies, then reply-only guests by the name they typed', () => {
        const roster = rsvpRoster([guest, host, removed], [rsvp('g', 'DECLINED', 0, 0), replyOnly('x', 'Maria', 'ATTENDING', 2, 1)]);

        expect(roster.map(({ id, name, status, replyOnly: fromInvitation }) => ({ id, name, status, fromInvitation }))).toEqual([
            { id: 'g', name: 'Anna', status: 'DECLINED', fromInvitation: false },
            { id: 'x', name: 'Maria', status: 'ATTENDING', fromInvitation: true },
        ]);
        expect(roster[1].rsvp?.adultCount).toBe(2);
    });

    it('never lists a reply twice, even if its member is in the member list', () => {
        const roster = rsvpRoster([guest], [replyOnly('g', 'Anna again', 'ATTENDING', 1)]);
        expect(roster).toHaveLength(1);
        expect(roster[0]).toMatchObject({ id: 'g', name: 'Anna', status: 'ATTENDING', replyOnly: false });
    });

    it('leaves out member RSVPs whose member is not a live guest', () => {
        expect(rsvpRoster([host, removed], [rsvp('h', 'ATTENDING', 1, 0), rsvp('r', 'ATTENDING', 1, 0)])).toEqual([]);
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

    it('counts attending reply-only guests, like the RSVP report', () => {
        const rsvps = [rsvp('g', 'ATTENDING', 2, 0), replyOnly('x', 'Maria', 'ATTENDING', 2, 1), replyOnly('y', 'Nikos', 'DECLINED')];
        expect(attendingGuestPeople([guest], rsvps)).toBe(5);
    });
});
