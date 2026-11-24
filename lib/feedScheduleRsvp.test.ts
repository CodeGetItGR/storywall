import { describe, expect, it } from 'vitest';

import { rsvpSessionAnchor, sessionRsvpAnswer } from '@/lib/feedScheduleRsvp';

const responses = [
    { eventSessionId: 'church', isAttending: true },
    { eventSessionId: 'party', isAttending: false },
];

describe('sessionRsvpAnswer', () => {
    it("reads the guest's answer for one session", () => {
        expect(sessionRsvpAnswer('ATTENDING', responses, 'church')).toBe('attending');
        expect(sessionRsvpAnswer('ATTENDING', responses, 'party')).toBe('declined');
        expect(sessionRsvpAnswer('ATTENDING', responses, 'brunch')).toBeNull();
    });

    it("says declined on every session once the guest isn't coming", () => {
        expect(sessionRsvpAnswer('DECLINED', responses, 'church')).toBe('declined');
        expect(sessionRsvpAnswer('DECLINED', [], 'brunch')).toBe('declined');
    });

    it('has no answer before the guest RSVPs', () => {
        expect(sessionRsvpAnswer(null, [], 'church')).toBeNull();
    });

    it("names a session's question on the RSVP page", () => {
        expect(rsvpSessionAnchor('church')).toBe('rsvp-session-church');
    });
});
