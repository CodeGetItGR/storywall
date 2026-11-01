import { describe, expect, it } from 'vitest';

import type { BusinessOverviewDto } from '@/lib/api/types';
import { businessInsightKeys, businessSections, monthLabel } from '@/lib/business';

const base: BusinessOverviewDto = { partner: false, vendorType: 'MUSIC', totals: { events: 2, guests: 40, listTaps: 3 } };

describe('businessInsightKeys', () => {
    it('gives a vendor three counts', () => {
        expect(businessInsightKeys(base)).toEqual(['events', 'guests', 'listTaps']);
    });

    it('gives a partner six', () => {
        const partner = { ...base, partner: true, totals: { ...base.totals, proViews: 5, postViewers: 2, cardTaps: 1 } };
        expect(businessInsightKeys(partner)).toEqual(['events', 'guests', 'proViews', 'postViewers', 'cardTaps', 'listTaps']);
    });
});

describe('businessSections', () => {
    it('shows content and the sneak peek sample only with a Pro album', () => {
        expect(businessSections(base, null)).toMatchObject({ content: false, sneakPeekSample: false, printPrices: false });
        const photo = { ...base, vendorType: 'PHOTOGRAPHER' as const, content: { proItems: 1, sneakPeeks: 0, proUsedBytes: 10 } };
        expect(businessSections(photo, null)).toMatchObject({ content: true, sneakPeekSample: true, printPrices: true });
    });

    it('shows the feed card only when the partner has one', () => {
        expect(businessSections({ ...base, partner: true }, null).feedCard).toBe(false);
        expect(businessSections({ ...base, partner: true }, { variant: 'FEATURE_CARD' } as never).feedCard).toBe(true);
    });

    it('hides the previews section when it would be empty', () => {
        expect(businessSections(base, null).previews).toBe(false);
    });
});

describe('monthLabel', () => {
    it('formats YYYY-MM as a short month', () => {
        expect(monthLabel('en', '2026-10')).toBe('Oct');
        expect(monthLabel('el', '2026-10')).toMatch(/^Οκτ/);
    });
});
