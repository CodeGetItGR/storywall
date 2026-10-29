import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPartnerCode, partnerCodeFromUrl, readPartnerCode, savePartnerCode, withoutPartnerCodeParam } from '@/lib/partnerCodeLink';

const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('partnerCodeFromUrl', () => {
    it('reads the promo param', () => {
        expect(partnerCodeFromUrl('https://storywall.gr/?promo=CARDS-10')).toBe('CARDS-10');
    });

    it('trims it', () => {
        expect(partnerCodeFromUrl('https://storywall.gr/?promo=%20CARDS10%20')).toBe('CARDS10');
    });

    it('ignores a missing, empty or malformed code', () => {
        expect(partnerCodeFromUrl('https://storywall.gr/')).toBeNull();
        expect(partnerCodeFromUrl('https://storywall.gr/?promo=')).toBeNull();
        expect(partnerCodeFromUrl('https://storywall.gr/?promo=<script>')).toBeNull();
        expect(partnerCodeFromUrl(`https://storywall.gr/?promo=${'A'.repeat(41)}`)).toBeNull();
    });
});

describe('saved partner code', () => {
    it('reads back what was saved', () => {
        savePartnerCode('CARDS10', 1_000);
        expect(readPartnerCode(1_000 + DAY_MS)).toBe('CARDS10');
    });

    it('expires after 30 days', () => {
        savePartnerCode('CARDS10', 1_000);
        expect(readPartnerCode(1_000 + 31 * DAY_MS)).toBeNull();
        expect(localStorage.length).toBe(0);
    });

    it('is gone once cleared', () => {
        savePartnerCode('CARDS10');
        clearPartnerCode();
        expect(readPartnerCode()).toBeNull();
    });

    it('treats a tampered value as nothing', () => {
        localStorage.setItem('storywall.partnerCode', JSON.stringify({ code: '<b>', savedAt: Date.now() }));
        expect(readPartnerCode()).toBeNull();
        localStorage.setItem('storywall.partnerCode', 'not json');
        expect(readPartnerCode()).toBeNull();
    });

    it('survives storage that throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => savePartnerCode('CARDS10')).not.toThrow();
        expect(readPartnerCode()).toBeNull();
    });
});

describe('withoutPartnerCodeParam', () => {
    it('drops only the promo param', () => {
        expect(withoutPartnerCodeParam('https://storywall.gr/weddings?utm_source=shop&promo=CARDS10#top')).toBe('/weddings?utm_source=shop#top');
    });

    it('is null when there is nothing to drop', () => {
        expect(withoutPartnerCodeParam('https://storywall.gr/weddings?utm_source=shop')).toBeNull();
    });
});
