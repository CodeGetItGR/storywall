import { describe, expect, it } from 'vitest';

import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import { invitationRsvpState, isRsvpClosed, rsvpSessionChoices } from '@/lib/invitation/rsvpSessions';

const DEADLINE = '2027-05-01T21:00:00Z';
const at = (iso: string) => new Date(iso).getTime();

const event = (rsvp: InvitationEventData['rsvp']): InvitationEventData => ({
    eventType: 'WEDDING',
    title: 'Μαρία & Νίκος',
    timezone: 'Europe/Athens',
    startAt: null,
    rsvp,
    cover: null,
    location: { name: null, address: null, mapsUrl: null },
    sessions: null,
    joinUrl: null,
});

describe('isRsvpClosed', () => {
    it('closes at the deadline, as the backend does', () => {
        expect(isRsvpClosed(DEADLINE, at(DEADLINE) - 1)).toBe(false);
        expect(isRsvpClosed(DEADLINE, at(DEADLINE))).toBe(true);
        expect(isRsvpClosed(DEADLINE, at('2027-06-01T00:00:00Z'))).toBe(true);
    });

    it('stays open without a deadline it can read', () => {
        expect(isRsvpClosed(null, Date.now())).toBe(false);
        expect(isRsvpClosed(undefined, Date.now())).toBe(false);
        expect(isRsvpClosed('soon', Date.now())).toBe(false);
    });
});

describe('rsvpSessionChoices', () => {
    it('shows the time alone, on the venue clock, when the sessions share a day', () => {
        const choices = rsvpSessionChoices(
            event({
                deadline: null,
                sessions: [
                    { id: 's1', title: 'Τελετή', startAt: '2027-06-12T15:00:00Z' },
                    { id: 's2', title: 'Δεξίωση', startAt: '2027-06-12T18:00:00Z' },
                ],
            }),
            'el',
        );
        expect(choices).toEqual([
            { id: 's1', title: 'Τελετή', when: '18:00' },
            { id: 's2', title: 'Δεξίωση', when: '21:00' },
        ]);
    });

    it('adds the day when they are on different days, and nothing for a session with no time', () => {
        const choices = rsvpSessionChoices(
            event({
                deadline: null,
                sessions: [
                    { id: 's1', title: 'Welcome drinks', startAt: '2027-06-11T17:00:00Z' },
                    { id: 's2', title: 'Wedding', startAt: '2027-06-12T15:00:00Z' },
                    { id: 's3', title: 'Brunch', startAt: null },
                ],
            }),
            'en',
        );
        expect(choices.map((choice) => choice.when)).toEqual(['June 11, 20:00', 'June 12, 18:00', '']);
    });

    it('asks about none from an older backend or an event without RSVP', () => {
        expect(rsvpSessionChoices(event({ deadline: DEADLINE }), 'el')).toEqual([]);
        expect(rsvpSessionChoices(event(null), 'el')).toEqual([]);
        expect(rsvpSessionChoices(null, 'el')).toEqual([]);
    });
});

describe('invitationRsvpState', () => {
    it('is closed after the deadline and lists the sessions', () => {
        const state = invitationRsvpState(event({ deadline: DEADLINE, sessions: [{ id: 's1', title: 'Τελετή', startAt: null }] }), 'el', at('2027-05-02T00:00:00Z'));
        expect(state).toEqual({ closed: true, sessions: [{ id: 's1', title: 'Τελετή', when: '' }] });
    });
});
