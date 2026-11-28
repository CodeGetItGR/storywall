import { describe, expect, it } from 'vitest';

import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import {
    type PublicInvitationDto,
    publicInvitationEndpoint,
    type PublishedInvitationLabels,
    publishedInvitationState,
    publishedInvitationTitle,
    readPublishedInvitation,
} from '@/lib/invitation/publishedInvitation';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';

const dto: PublicInvitationDto = {
    slug: 'maria-and-nikos',
    eventType: 'WEDDING',
    themeName: 'Olive grove',
    themeRevision: 2,
    design: SAMPLE_THEME,
    document: SAMPLE_DOCUMENT,
    imageUrls: { 'm-1': 'https://cdn.example/m-1.jpg' },
    updatedAt: '2026-11-07T10:00:00Z',
};

const labels: PublishedInvitationLabels = { title: 'Invitation', notFound: 'Not found', expired: 'Expired', loadFailed: 'Failed', retry: 'Retry' };

describe('publishedInvitationState', () => {
    it('reads a live invitation and resolves its images', () => {
        const state = publishedInvitationState(200, dto);
        if (state.kind !== 'found') throw new Error(`Expected found, got ${state.kind}`);
        expect(state.invitation.document).toEqual(SAMPLE_DOCUMENT);
        expect(state.invitation.theme).toEqual(SAMPLE_THEME);
        expect(state.invitation.media('m-1')).toBe('https://cdn.example/m-1.jpg');
        expect(state.invitation.media('missing')).toBeUndefined();
        expect(state.invitation.publishedAt).toBe('2026-11-07T10:00:00Z');
    });

    it('tells an unknown link from an expired one', () => {
        expect(publishedInvitationState(404, null)).toEqual({ kind: 'not-found' });
        expect(publishedInvitationState(410, null)).toEqual({ kind: 'expired' });
    });

    it('fails on any other answer, or a copy the renderer cannot draw', () => {
        expect(publishedInvitationState(500, null)).toEqual({ kind: 'error' });
        expect(publishedInvitationState(429, null)).toEqual({ kind: 'error' });
        expect(publishedInvitationState(200, { ...dto, document: { schemaVersion: 1, sections: 'nope' } })).toEqual({ kind: 'error' });
        expect(publishedInvitationState(200, { ...dto, design: null })).toEqual({ kind: 'error' });
    });

    it('hides the RSVP section when the event takes no replies', () => {
        const rsvpVisible = (body: PublicInvitationDto) => {
            const state = publishedInvitationState(200, body);
            if (state.kind !== 'found') throw new Error(`Expected found, got ${state.kind}`);
            return state.invitation.document.sections.filter((section) => section.type === 'rsvp').map((section) => section.visible);
        };
        expect(rsvpVisible(dto)).toContain(true);
        expect(rsvpVisible({ ...dto, rsvpOpen: true })).toContain(true);
        expect(rsvpVisible({ ...dto, rsvpOpen: false })).toEqual([false]);
    });

    it('treats missing image urls as none', () => {
        const state = publishedInvitationState(200, { ...dto, imageUrls: undefined });
        expect(state.kind === 'found' && state.invitation.media('m-1')).toBeUndefined();
    });
});

describe('following the event', () => {
    const event: InvitationEventData = {
        eventType: 'WEDDING',
        title: 'Μαρία & Νίκος',
        timezone: 'Europe/Athens',
        startAt: '2027-07-12T15:30:00Z',
        rsvp: null,
        cover: null,
        location: { name: null, address: null, mapsUrl: null },
        sessions: null,
        joinUrl: 'https://storywall.gr/q/tok',
    };
    const linkedDate = {
        ...SAMPLE_DOCUMENT,
        sections: SAMPLE_DOCUMENT.sections.map((section) => (section.type === 'date' ? { ...section, link: { source: 'event', enabled: true } } : section)),
    };
    const dateOf = (state: ReturnType<typeof publishedInvitationState>) =>
        state.kind === 'found' ? state.invitation.document.sections.find((section) => section.type === 'date') : undefined;

    it('shows a linked section as the event is now, and hands over the join link', () => {
        const state = publishedInvitationState(200, { ...dto, document: linkedDate, event });
        expect(dateOf(state)?.type === 'date' && dateOf(state)?.data).toMatchObject({ iso: '2027-07-12T18:30' });
        expect(state.kind === 'found' && state.invitation.joinUrl).toBe('https://storywall.gr/q/tok');
    });

    it('keeps the saved copy when the backend sends no event', () => {
        const state = publishedInvitationState(200, { ...dto, document: linkedDate });
        expect(state.kind === 'found' && state.invitation.document).toEqual(linkedDate);
        expect(state.kind === 'found' && state.invitation.joinUrl).toBeUndefined();
    });

    it('closes the RSVP once its deadline has passed, and lists the sessions it asks about', () => {
        const withRsvp = { ...event, rsvp: { deadline: '2027-05-01T21:00:00Z', sessions: [{ id: 's1', title: 'Τελετή', startAt: '2027-07-12T15:30:00Z' }] } };
        const before = readPublishedInvitation({ ...dto, event: withRsvp }, new Date('2027-05-01T20:59:00Z').getTime());
        const after = readPublishedInvitation({ ...dto, event: withRsvp }, new Date('2027-05-01T21:00:00Z').getTime());
        expect(before.rsvp).toEqual({ closed: false, sessions: [{ id: 's1', title: 'Τελετή', when: '18:30' }] });
        expect(after.rsvp?.closed).toBe(true);
    });

    it('keeps the RSVP open, asking about no session, for an event from an older backend', () => {
        expect(readPublishedInvitation({ ...dto, event: { ...event, rsvp: { deadline: null } } }).rsvp).toEqual({ closed: false, sessions: [] });
    });

    it('keeps the saved copy, rather than failing, when the event is not in the shape the page reads', () => {
        const state = publishedInvitationState(200, { ...dto, document: linkedDate, event: { ...event, sessions: [{ id: 's1' }] } });
        expect(state.kind === 'found' && state.invitation.document).toEqual(linkedDate);
        expect(state.kind === 'found' && state.invitation.joinUrl).toBeUndefined();
    });
});

describe('publishedInvitationTitle', () => {
    it('names the invitation, or the message shown in its place', () => {
        expect(publishedInvitationTitle(publishedInvitationState(200, dto), labels)).toBe('Invitation');
        expect(publishedInvitationTitle({ kind: 'not-found' }, labels)).toBe('Not found');
        expect(publishedInvitationTitle({ kind: 'expired' }, labels)).toBe('Expired');
        expect(publishedInvitationTitle({ kind: 'error' }, labels)).toBe('Failed');
    });
});

describe('publicInvitationEndpoint', () => {
    it('points at the public read', () => {
        expect(publicInvitationEndpoint('maria-and-nikos')).toBe('/api/public/invitations/maria-and-nikos');
    });
});
