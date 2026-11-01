import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import type { BusinessOverviewDto } from '@/lib/api/types';
import type { PartnerPortalResponseDto } from '@/lib/api/types';
import { businessEarnings, businessHasNumbers, businessInsightKeys, businessSections, monthLabel, trendListLabel } from '@/lib/business';

const base: BusinessOverviewDto = {
    partner: false,
    showPartnerPrompt: false,
    vendorType: 'MUSIC',
    totals: { events: 2, guests: 40, listTaps: 3 },
};

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

    it('shows the partner prompt only when the server says so', () => {
        expect(businessSections(base, null).partnerPrompt).toBe(false);
        expect(businessSections({ ...base, showPartnerPrompt: true }, null).partnerPrompt).toBe(true);
    });
});

describe('businessHasNumbers', () => {
    it('is false when every total and month is zero', () => {
        const zeros = { ...base, totals: { events: 0, guests: 0, listTaps: 0, proViews: 0 }, trend: [{ month: '2026-11', views: 0 }] };
        expect(businessHasNumbers(zeros)).toBe(false);
    });

    it('is true with any count or any month with views', () => {
        expect(businessHasNumbers(base)).toBe(true);
        expect(businessHasNumbers({ ...base, totals: { events: 0, guests: 0, listTaps: 0 }, trend: [{ month: '2026-11', views: 4 }] })).toBe(true);
    });
});

describe('businessEarnings', () => {
    const portal = {
        name: 'Villa',
        totals: [{ currency: 'EUR', accruedMinor: 300, paidMinor: 100 }],
        tierProgress: null,
    } as unknown as PartnerPortalResponseDto;

    it('is hidden for non-partners', () => {
        expect(businessEarnings(false, { data: portal, error: null, isLoading: false })).toEqual({ state: 'hidden' });
    });

    it('reads the balances', () => {
        expect(businessEarnings(true, { data: portal, error: null, isLoading: false })).toMatchObject({
            state: 'ready',
            balances: [{ currency: 'EUR', owedMinor: 200 }],
        });
    });

    it('names the refusals and any other failure', () => {
        const refused = (errorCode: number) => businessEarnings(true, { error: new ApiError(403, { errorCode }), isLoading: false });
        expect(refused(ERROR_CODES.PARTNER_EMAIL_NOT_VERIFIED)).toEqual({ state: 'notVerified' });
        expect(refused(ERROR_CODES.PARTNER_NOT_LINKED)).toEqual({ state: 'notLinked' });
        expect(businessEarnings(true, { error: new ApiError(500, null), isLoading: false })).toEqual({ state: 'failed' });
        expect(businessEarnings(true, { error: null, isLoading: true })).toEqual({ state: 'loading' });
    });
});

describe('trendListLabel', () => {
    it('lists every month with its views', () => {
        const trend = [
            { month: '2026-10', views: 0 },
            { month: '2026-11', views: 15 },
        ];
        expect(trendListLabel('en', trend, (month, views) => `${month}: ${views}`)).toBe('October 2026: 0, November 2026: 15');
    });
});

describe('monthLabel', () => {
    it('formats YYYY-MM as a short month', () => {
        expect(monthLabel('en', '2026-10')).toBe('Oct');
        expect(monthLabel('el', '2026-10')).toMatch(/^Οκτ/);
    });
});
