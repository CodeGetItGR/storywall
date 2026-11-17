import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { canPublishSlug, inviteHostFor, normalizeSlug, readPublishFailure, type SlugAvailabilityDto, slugCheck } from '@/lib/invitation/publication';

const refused = (status: number, errorCode: number | string) => new ApiError(status, { status, errorCode, title: 'Refused' });

describe('readPublishFailure', () => {
    it.each([
        [5012, 'plan-missing'],
        [5217, 'coverage-ended'],
        [5216, 'no-event'],
        [5218, 'slug-taken'],
        [5219, 'slug-not-allowed'],
        [5208, 'failed'],
    ] as const)('reads error code %s as %s', (code, failure) => {
        expect(readPublishFailure(refused(409, code))).toBe(failure);
    });

    it('reads an error code sent as text', () => {
        expect(readPublishFailure(refused(409, '5012'))).toBe('plan-missing');
    });

    it('treats a network error or a server error as a plain failure', () => {
        expect(readPublishFailure(new TypeError('Failed to fetch'))).toBe('failed');
        expect(readPublishFailure(new ApiError(500, null))).toBe('failed');
    });
});

describe('slugCheck', () => {
    const answer = (slug: string, available: boolean, reason: SlugAvailabilityDto['reason'] = null): SlugAvailabilityDto => ({
        slug,
        available,
        reason,
    });

    it('says nothing for an empty field', () => {
        expect(slugCheck('', undefined, { failed: false })).toBe('empty');
    });

    it('turns down a link the backend would refuse, without asking', () => {
        expect(slugCheck('ab', undefined, { failed: false })).toBe('invalid');
        expect(slugCheck('maria--nikos', undefined, { failed: false })).toBe('invalid');
        expect(slugCheck('μαρία', undefined, { failed: false })).toBe('invalid');
    });

    it('waits for the answer for this link', () => {
        expect(slugCheck('maria-nikos', undefined, { failed: false })).toBe('checking');
        expect(slugCheck('maria-nikos', answer('maria', true), { failed: false })).toBe('checking');
    });

    it('reads the answer', () => {
        expect(slugCheck('maria-nikos', answer('maria-nikos', true), { failed: false })).toBe('available');
        expect(slugCheck('maria-nikos', answer('maria-nikos', false, 'TAKEN'), { failed: false })).toBe('taken');
        expect(slugCheck('admin', answer('admin', false, 'RESERVED'), { failed: false })).toBe('reserved');
        expect(slugCheck('maria-nikos', answer('maria-nikos', false, 'INVALID'), { failed: false })).toBe('invalid');
    });

    it('lets a failed check through: the publish checks again', () => {
        expect(slugCheck('maria-nikos', undefined, { failed: true })).toBe('unknown');
        expect(canPublishSlug('unknown')).toBe(true);
    });

    it('only lets a free link publish', () => {
        expect(canPublishSlug('available')).toBe(true);
        for (const check of ['empty', 'invalid', 'checking', 'taken', 'reserved'] as const) expect(canPublishSlug(check)).toBe(false);
    });
});

describe('normalizeSlug', () => {
    it('trims and lowercases, as the backend stores it', () => {
        expect(normalizeSlug('  Maria-Nikos ')).toBe('maria-nikos');
    });
});

describe('inviteHostFor', () => {
    it('puts invite. in front of the site host, without www.', () => {
        expect(inviteHostFor('https://www.storywall.gr')).toBe('invite.storywall.gr');
        expect(inviteHostFor('https://staging.storywall.gr')).toBe('invite.staging.storywall.gr');
        expect(inviteHostFor('http://localhost:3000')).toBe('invite.localhost:3000');
    });
});
