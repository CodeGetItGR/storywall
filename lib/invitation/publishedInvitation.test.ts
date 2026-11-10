import { describe, expect, it } from 'vitest';

import {
    type PublicInvitationDto,
    publicInvitationEndpoint,
    type PublishedInvitationLabels,
    publishedInvitationState,
    publishedInvitationTitle,
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

    it('treats missing image urls as none', () => {
        const state = publishedInvitationState(200, { ...dto, imageUrls: undefined });
        expect(state.kind === 'found' && state.invitation.media('m-1')).toBeUndefined();
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
