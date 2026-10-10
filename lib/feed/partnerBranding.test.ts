import { describe, expect, it } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';
import { isPartnerCardSlot, partnerBrandingText, withPartnerCards } from '@/lib/feed/partnerBranding';

const PLACEMENT = { firstAfter: 4, every: 25 };

function posts(count: number): PostResponseDto[] {
    return Array.from({ length: count }, (_, index) => ({ id: `post-${index + 1}` }) as PostResponseDto);
}

function cardPositions(count: number): number[] {
    const positions: number[] = [];
    let seen = 0;
    for (const item of withPartnerCards(posts(count), PLACEMENT)) {
        if (item.kind === 'post') seen += 1;
        else positions.push(seen);
    }
    return positions;
}

describe('partner card placement', () => {
    it('adds no card to a feed of firstAfter posts or fewer', () => {
        expect(cardPositions(0)).toEqual([]);
        expect(cardPositions(4)).toEqual([]);
    });

    it('places cards after post 4, 29 and 54', () => {
        expect(cardPositions(5)).toEqual([4]);
        expect(cardPositions(28)).toEqual([4]);
        expect(cardPositions(29)).toEqual([4, 29]);
        expect(cardPositions(60)).toEqual([4, 29, 54]);
    });

    // Same counts as the backend report's cardSlots: 0, 4, 5, 29, 30, 306 posts → 0, 0, 1, 2, 2, 13.
    it('matches the server report card count', () => {
        expect([0, 4, 5, 29, 30, 306].map((count) => cardPositions(count).length)).toEqual([0, 0, 1, 2, 2, 13]);
    });

    it('adds nothing without a placement', () => {
        expect(withPartnerCards(posts(10), null).every((item) => item.kind === 'post')).toBe(true);
    });

    it('gives each card a stable key by position', () => {
        const keys = withPartnerCards(posts(30), PLACEMENT).flatMap((item) => (item.kind === 'partner' ? [item.key] : []));
        expect(keys).toEqual(['partner-4', 'partner-29']);
    });

    it('ignores a non-positive rhythm after the first card', () => {
        expect(isPartnerCardSlot(4, 100, { firstAfter: 4, every: 0 })).toBe(true);
        expect(isPartnerCardSlot(5, 100, { firstAfter: 4, every: 0 })).toBe(false);
    });
});

describe('partnerBrandingText', () => {
    const text = { el: 'Ελληνικά', en: 'English' };

    it('picks the UI language', () => {
        expect(partnerBrandingText(text, 'en')).toBe('English');
        expect(partnerBrandingText(text, 'el')).toBe('Ελληνικά');
    });

    it('falls back to Greek', () => {
        expect(partnerBrandingText({ el: 'Ελληνικά', en: ' ' }, 'en')).toBe('Ελληνικά');
        expect(partnerBrandingText(text, 'fr')).toBe('Ελληνικά');
    });
});
