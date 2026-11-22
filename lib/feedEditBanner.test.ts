import { describe, expect, it } from 'vitest';

import { type FeedEditBannerInput, feedEditBannerLook, feedEditBannerState } from '@/lib/feedEditBanner';
import { readFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

const locked: FeedEditBannerInput = { flag: true, saveMyDate: false, writable: true, offered: true, checkout: true, canBuy: true, paused: false };

describe('feedEditBannerState', () => {
    it('invites a main host to unlock Save my date', () => {
        expect(feedEditBannerState(locked)).toBe('locked');
    });

    it('needs every condition for the lock', () => {
        for (const change of [{ offered: false }, { checkout: false }, { canBuy: false }, { paused: true }]) {
            expect(feedEditBannerState({ ...locked, ...change })).toBeNull();
        }
    });

    it('invites a host with Save my date to start editing, on a writable event', () => {
        expect(feedEditBannerState({ ...locked, saveMyDate: true, canBuy: false, offered: false })).toBe('included');
        expect(feedEditBannerState({ ...locked, saveMyDate: true, writable: false })).toBeNull();
    });

    it('shows nothing with the flag off', () => {
        expect(feedEditBannerState({ ...locked, flag: false })).toBeNull();
        expect(feedEditBannerState({ ...locked, flag: false, saveMyDate: true })).toBeNull();
    });
});

describe('feedEditBannerLook', () => {
    const rose = {
        slug: 'rose',
        name: 'Rose',
        eventType: 'WEDDING',
        design: SAMPLE_THEME,
        document: SAMPLE_DOCUMENT,
        assetUrls: {},
    } as unknown as InvitationThemePublicDto;

    it("draws the layout's own Save my date theme", () => {
        const layout = { ...readFeedLayout(null, null), themeSlug: 'own', theme: SAMPLE_THEME };
        expect(feedEditBannerLook(layout, rose)).toMatchObject({ kind: 'invitation', theme: SAMPLE_THEME });
    });

    it('puts a wall layout on the fallback theme', () => {
        const look = feedEditBannerLook(readFeedLayout(null, null), rose);
        expect(look.kind).toBe('invitation');
        if (look.kind !== 'invitation') return;
        expect(look.document.themeId).toBe(SAMPLE_DOCUMENT.themeId);
        expect(look.cover.type).toBe('feedCover');
    });

    it("draws the event's wall look when the event type has no Save my date theme", () => {
        expect(feedEditBannerLook(readFeedLayout(null, null), undefined)).toEqual({ kind: 'wall' });
    });
});
