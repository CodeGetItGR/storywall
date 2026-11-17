import { describe, expect, it } from 'vitest';

import { storyEvent, storyMember } from '@/.storybook/fixtures';
import type { InvitationDocument } from '@/lib/invitation/document';
import {
    eventsForInvitation,
    invitationEventDetails,
    invitationEventRequest,
    invitationTitle,
    plansWithInvitation,
} from '@/lib/invitation/invitationEvent';
import { sampleInvitationPlan } from '@/lib/invitation/samplePlan';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';

type Section = InvitationDocument['sections'][number];

const withSections = (...sections: Section[]): InvitationDocument => ({ ...SAMPLE_DOCUMENT, sections });

const top = (...texts: string[]): Section => ({
    ...SAMPLE_SECTIONS.top,
    elements: texts.map((text, index) => ({ id: `t-${index}`, kind: 'text' as const, role: 'title' as const, text, style: {} })),
});

const BEFORE = new Date('2026-07-01T00:00:00Z');
const AFTER = new Date('2026-08-01T00:00:00Z');

describe('invitationTitle', () => {
    it('takes the names at the top, on one line', () => {
        expect(invitationTitle(withSections(top('Μαρία\n&', '  Γιάννης ')))).toBe('Μαρία & Γιάννης');
    });

    it('falls back to the names of the couple', () => {
        expect(invitationTitle(withSections(top(), SAMPLE_SECTIONS.coupleNames))).toBe('Μαρία & Γιάννης');
    });

    it('skips hidden sections and has no title without names', () => {
        expect(invitationTitle(withSections({ ...top('Μαρία'), visible: false }))).toBeNull();
        expect(invitationTitle(withSections(SAMPLE_SECTIONS.date))).toBeNull();
    });
});

describe('invitationEventDetails', () => {
    it('takes the date while it is ahead, and the ceremony', () => {
        expect(invitationEventDetails(withSections(SAMPLE_SECTIONS.date, SAMPLE_SECTIONS.locations), BEFORE)).toEqual({
            title: null,
            startAt: '2026-07-12T18:00',
            locationName: 'Ιερός Ναός Αγίου Νικολάου',
            locationAddress: 'Παραλία Ρόδου',
            mapsUrl: 'https://maps.google.com/?q=Rhodes',
        });
    });

    it('asks again for a date that has passed', () => {
        expect(invitationEventDetails(withSections(SAMPLE_SECTIONS.date), AFTER).startAt).toBeNull();
    });

    it('takes the reception when there is no ceremony, without a placeholder map link', () => {
        const locations = {
            ...SAMPLE_SECTIONS.locations,
            data: { ...SAMPLE_SECTIONS.locations.data, ceremony: '', receptionMap: 'https://maps.google.com/' },
        };
        expect(invitationEventDetails(withSections(locations), BEFORE)).toMatchObject({
            locationName: 'Κτήμα',
            locationAddress: 'Ρόδος',
            mapsUrl: null,
        });
    });
});

describe('plansWithInvitation', () => {
    it('keeps only the plans that include the invitation', () => {
        const withIt = sampleInvitationPlan();
        const without = sampleInvitationPlan({ code: 'BASIC', moduleKeys: ['gallery'] });
        expect(plansWithInvitation([without, withIt])).toEqual([withIt]);
    });
});

describe('eventsForInvitation', () => {
    const hosted = (eventId: string) => storyMember({ id: `mem-${eventId}`, eventId, role: 'HOST' });
    const startingAt = (id: string, startAt: string) => storyEvent({ id, schedule: { ...storyEvent().schedule, startAt } });

    it('keeps hosted events of the theme type with no invitation, soonest first', () => {
        const events = [
            startingAt('late', '2027-09-01T15:00:00Z'),
            startingAt('soon', '2027-06-01T15:00:00Z'),
            storyEvent({ id: 'baptism', eventType: 'BAPTISM' }),
            storyEvent({ id: 'guest' }),
            storyEvent({ id: 'taken' }),
            storyEvent({ id: 'deleted', deletedAt: '2026-10-01T00:00:00Z' }),
        ];
        const memberships = [
            hosted('late'),
            hosted('soon'),
            hosted('baptism'),
            storyMember({ eventId: 'guest' }),
            hosted('taken'),
            hosted('deleted'),
        ];

        const chosen = eventsForInvitation({ memberships, events, eventType: 'WEDDING', eventsWithInvitation: new Set(['taken']) });
        expect(chosen.map((event) => event.id)).toEqual(['soon', 'late']);
    });
});

describe('invitationEventRequest', () => {
    it('sends the place from the invitation with the answers of the host and the plan', () => {
        const request = invitationEventRequest({
            details: { title: null, startAt: null, locationName: 'Κτήμα', locationAddress: null, mapsUrl: null },
            title: '  Μαρία & Γιάννης ',
            startAt: '2027-06-12T18:00',
            eventType: 'WEDDING',
            planTierCode: 'PREMIUM',
            coverageOptionId: 'opt-3m',
            timezone: 'Europe/Athens',
            initialSessionTitle: 'Γάμος',
        });
        expect(request).toMatchObject({
            title: 'Μαρία & Γιάννης',
            eventType: 'WEDDING',
            visibility: 'PRIVATE',
            startAt: new Date('2027-06-12T18:00').toISOString(),
            timezone: 'Europe/Athens',
            locationName: 'Κτήμα',
            locationAddress: undefined,
            planTierCode: 'PREMIUM',
            coverageOptionId: 'opt-3m',
            initialSessionTitle: 'Γάμος',
        });
    });
});
