import { describe, expect, it } from 'vitest';

import { type FeedEditBannerInput, feedEditBannerState } from '@/lib/feedEditBanner';

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
