import { afterEach, describe, expect, it } from 'vitest';

import { DRAFT_TOKEN_HEADER, draftTokenHeaders, forgetDraftToken, readDraftToken, saveDraftToken } from '@/lib/invitation/draftTokens';

const STORAGE_KEY = 'storywall:invitationDraftTokens:v1';
const NOW = Date.parse('2026-11-11T10:00:00Z');
const DAY = 86_400_000;

afterEach(() => window.localStorage.clear());

describe('draft tokens', () => {
    it('keeps a token for its draft until it expires', () => {
        saveDraftToken('draft-1', 'tok-1', '2026-11-12T10:00:00Z', NOW);
        expect(readDraftToken('draft-1', NOW)).toBe('tok-1');
        expect(readDraftToken('draft-1', NOW + DAY)).toBeNull();
        expect(readDraftToken('draft-2', NOW)).toBeNull();
    });

    it('keeps a token with no end date', () => {
        saveDraftToken('draft-1', 'tok-1', null, NOW);
        expect(readDraftToken('draft-1', NOW + 365 * DAY)).toBe('tok-1');
    });

    it('drops expired tokens when a new one is kept', () => {
        saveDraftToken('old', 'tok-old', '2026-11-10T10:00:00Z', NOW - 2 * DAY);
        saveDraftToken('new', 'tok-new', null, NOW);
        expect(Object.keys(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!))).toEqual(['new']);
    });

    it('forgets a claimed draft and clears the store after the last one', () => {
        saveDraftToken('draft-1', 'tok-1', null, NOW);
        saveDraftToken('draft-2', 'tok-2', null, NOW);
        forgetDraftToken('draft-1');
        expect(readDraftToken('draft-1', NOW)).toBeNull();
        expect(readDraftToken('draft-2', NOW)).toBe('tok-2');
        forgetDraftToken('draft-2');
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('ignores a broken store and broken entries', () => {
        window.localStorage.setItem(STORAGE_KEY, '{"draft-1":');
        expect(readDraftToken('draft-1', NOW)).toBeNull();
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ 'draft-1': { token: '', expiresAt: null }, 'draft-2': { token: 'tok-2', expiresAt: null } }),
        );
        expect(readDraftToken('draft-1', NOW)).toBeNull();
        expect(readDraftToken('draft-2', NOW)).toBe('tok-2');
    });

    it('sends the header only when the browser holds the token', () => {
        expect(draftTokenHeaders('draft-1')).toEqual({});
        saveDraftToken('draft-1', 'tok-1', null);
        expect(draftTokenHeaders('draft-1')).toEqual({ [DRAFT_TOKEN_HEADER]: 'tok-1' });
    });
});
