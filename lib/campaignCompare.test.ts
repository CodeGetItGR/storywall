import { describe, expect, it } from 'vitest';

import type { CampaignCountsDto, CampaignDto, CampaignListItemDto } from '@/lib/api/types';
import {
    campaignListRows,
    campaignsForTab,
    campaignTab,
    changeOf,
    rateMeasure,
    revenueChangeOf,
    sparklinePoints,
    sumCounts,
    trendOf,
    verdictOf,
} from '@/lib/campaignCompare';

function counts(overrides: Partial<CampaignCountsDto> = {}): CampaignCountsDto {
    return {
        visits: 0,
        visitors: 0,
        createClicks: 0,
        plansClicks: 0,
        planPicks: 0,
        signedUp: 0,
        createdEvent: 0,
        paidHost: 0,
        sales: 0,
        salesRevenueMinorByCurrency: {},
        ...overrides,
    };
}

function campaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
    return {
        id: 'c-1',
        name: 'Launch',
        linkName: 'launch',
        status: 'LIVE',
        startsAt: null,
        endsAt: null,
        archivedAt: null,
        discount: null,
        linkCount: 0,
        createdAt: '2026-10-01T09:00:00Z',
        ...overrides,
    };
}

function item(campaignOverrides: Partial<CampaignDto>, current: Partial<CampaignCountsDto> = {}): CampaignListItemDto {
    return { campaign: campaign(campaignOverrides), current: counts(current), previous: counts(), daily: [] };
}

describe('changeOf', () => {
    it('has nothing to compare with for all time', () => {
        expect(changeOf(5, null)).toBeNull();
        expect(changeOf(5, undefined)).toBeNull();
    });

    it('says same when nothing moved', () => {
        expect(changeOf(40, 40)).toEqual({ kind: 'same' });
    });

    it('counts small numbers instead of a percent', () => {
        expect(changeOf(5, 3)).toEqual({ kind: 'count', direction: 'up', amount: 2 });
        expect(changeOf(2, 9)).toEqual({ kind: 'count', direction: 'down', amount: 7 });
    });

    it('counts a rise from zero, which has no percent', () => {
        expect(changeOf(50, 0)).toEqual({ kind: 'count', direction: 'up', amount: 50 });
    });

    it('gives a percent once either side reaches ten', () => {
        expect(changeOf(12, 8)).toEqual({ kind: 'percent', direction: 'up', ratio: 0.5 });
        expect(changeOf(30, 40)).toEqual({ kind: 'percent', direction: 'down', ratio: 0.25 });
    });

    it('takes another threshold, as money does', () => {
        expect(changeOf(300, 200, 0)).toEqual({ kind: 'percent', direction: 'up', ratio: 0.5 });
    });
});

describe('revenueChangeOf', () => {
    it('compares one currency', () => {
        expect(revenueChangeOf({ EUR: 3000 }, { EUR: 2000 })).toEqual({ currency: 'EUR', change: { kind: 'percent', direction: 'up', ratio: 0.5 } });
        expect(revenueChangeOf({ EUR: 3000 }, {})).toEqual({ currency: 'EUR', change: { kind: 'count', direction: 'up', amount: 3000 } });
    });

    it('has no single number for two currencies, none at all, or no revenue', () => {
        expect(revenueChangeOf({ EUR: 3000 }, { USD: 2000 })).toBeNull();
        expect(revenueChangeOf({}, {})).toBeNull();
        expect(revenueChangeOf(null, null)).toBeNull();
        expect(revenueChangeOf({ EUR: 3000 }, null)).toBeNull();
    });
});

describe('verdictOf', () => {
    const others = [counts({ visitors: 200, signedUp: 10, sales: 4 })];

    it('is too early under 20 visitors', () => {
        expect(verdictOf(counts({ visitors: 19, sales: 5 }), others)).toEqual({ kind: 'early' });
    });

    it('calls out 100 visitors with no sign-ups and no sales', () => {
        expect(verdictOf(counts({ visitors: 100 }), others)).toEqual({ kind: 'noSignUps' });
    });

    it('has nothing to say with no other side of 20 visitors', () => {
        expect(verdictOf(counts({ visitors: 50, sales: 2 }), [counts({ visitors: 19, sales: 9 })])).toBeNull();
        expect(verdictOf(counts({ visitors: 50, sales: 2 }), [])).toBeNull();
    });

    it('is better without a multiple when the other side has none', () => {
        expect(verdictOf(counts({ visitors: 50, signedUp: 3 }), [counts({ visitors: 80 })])).toEqual({
            kind: 'better',
            measure: 'signedUp',
            multiple: null,
        });
    });

    it('is better at 1.5 times the other side, with the multiple', () => {
        // 6 sales / 100 = 6% against 4 / 200 = 2%.
        expect(verdictOf(counts({ visitors: 100, sales: 6 }), others)).toEqual({ kind: 'better', measure: 'sales', multiple: 3 });
        // 3 / 100 = 3% against 2%: exactly 1.5.
        expect(verdictOf(counts({ visitors: 100, sales: 3 }), others)).toEqual({ kind: 'better', measure: 'sales', multiple: 1.5 });
    });

    it('is worse at half the other side or less', () => {
        expect(verdictOf(counts({ visitors: 100, sales: 1, signedUp: 4 }), others)).toEqual({ kind: 'worse', measure: 'sales' });
    });

    it('is about average in between', () => {
        expect(verdictOf(counts({ visitors: 100, sales: 2, signedUp: 1 }), others)).toEqual({ kind: 'average', measure: 'sales' });
    });

    it('measures sign-ups when neither side has a sale', () => {
        expect(verdictOf(counts({ visitors: 100, signedUp: 10 }), [counts({ visitors: 100, signedUp: 5 })])).toEqual({
            kind: 'better',
            measure: 'signedUp',
            multiple: 2,
        });
    });

    it('measures sales when only the other side has one', () => {
        expect(verdictOf(counts({ visitors: 100, signedUp: 10 }), others)).toEqual({ kind: 'worse', measure: 'sales' });
    });

    it('leaves out others under 20 visitors from the average', () => {
        const mixed = [counts({ visitors: 5, sales: 5 }), counts({ visitors: 100, sales: 2 })];
        expect(verdictOf(counts({ visitors: 100, sales: 2 }), mixed)).toEqual({ kind: 'average', measure: 'sales' });
    });
});

describe('rateMeasure', () => {
    it('is sales once there is one, else sign-ups', () => {
        expect(rateMeasure(counts({ sales: 1 }))).toBe('sales');
        expect(rateMeasure(counts({ signedUp: 4 }))).toBe('signedUp');
    });
});

describe('sumCounts', () => {
    it('adds every number and each currency', () => {
        expect(
            sumCounts([
                counts({ visitors: 3, sales: 1, salesRevenueMinorByCurrency: { EUR: 100 } }),
                counts({ visitors: 4, sales: 2, salesRevenueMinorByCurrency: { EUR: 50, USD: 10 } }),
            ]),
        ).toEqual(counts({ visitors: 7, sales: 3, salesRevenueMinorByCurrency: { EUR: 150, USD: 10 } }));
    });

    it('has no revenue when one side has none', () => {
        expect(sumCounts([counts({ salesRevenueMinorByCurrency: null }), counts()]).salesRevenueMinorByCurrency).toBeNull();
    });
});

describe('trendOf', () => {
    const days = (values: number[]) => values.map((visitors, index) => ({ date: `2026-11-0${index + 1}`, visitors }));

    it('compares the second half of the range with the first', () => {
        expect(trendOf(days([1, 2, 5, 6]))).toBe('up');
        expect(trendOf(days([6, 5, 2, 1]))).toBe('down');
        expect(trendOf(days([3, 1, 1, 3]))).toBe('flat');
    });

    it('leaves the middle day of an odd range out', () => {
        expect(trendOf(days([2, 99, 2]))).toBe('flat');
    });

    it('is flat with under two days', () => {
        expect(trendOf(days([4]))).toBe('flat');
        expect(trendOf([])).toBe('flat');
    });
});

describe('sparklinePoints', () => {
    it('spreads the days across the width, the highest at the top', () => {
        expect(sparklinePoints([0, 5, 10], 80, 20)).toBe('0.0,20.0 40.0,10.0 80.0,0.0');
    });

    it('draws a flat line at the bottom for no visitors', () => {
        expect(sparklinePoints([0, 0], 80, 20)).toBe('0.0,20.0 80.0,20.0');
    });
});

describe('campaignTab', () => {
    it('puts ended and archived campaigns under Past', () => {
        expect(campaignTab(campaign({ status: 'ENDED' }))).toBe('past');
        expect(campaignTab(campaign({ status: 'ARCHIVED' }))).toBe('past');
        expect(campaignTab(campaign({ status: 'LIVE' }))).toBe('current');
        expect(campaignTab(campaign({ status: 'SCHEDULED' }))).toBe('current');
    });
});

describe('campaignsForTab', () => {
    it('orders Current: live with dates, then scheduled, then undated, each by visitors', () => {
        const items = [
            item({ id: 'undated', status: 'LIVE' }, { visitors: 900 }),
            item({ id: 'scheduled', status: 'SCHEDULED', startsAt: '2026-12-01T00:00:00Z' }),
            item({ id: 'live-small', status: 'LIVE', endsAt: '2026-12-01T00:00:00Z' }, { visitors: 10 }),
            item({ id: 'live-big', status: 'LIVE', startsAt: '2026-11-01T00:00:00Z' }, { visitors: 50 }),
            item({ id: 'ended', status: 'ENDED', endsAt: '2026-10-01T00:00:00Z' }),
        ];
        expect(campaignsForTab(items, 'current').map((row) => row.campaign.id)).toEqual(['live-big', 'live-small', 'scheduled', 'undated']);
    });

    it('orders Past by end or archive date, latest first', () => {
        const items = [
            item({ id: 'old', status: 'ENDED', endsAt: '2026-09-01T00:00:00Z' }),
            item({ id: 'archived', status: 'ARCHIVED', archivedAt: '2026-11-05T00:00:00Z', endsAt: '2026-08-01T00:00:00Z' }),
            item({ id: 'recent', status: 'ENDED', endsAt: '2026-10-20T00:00:00Z' }),
        ];
        expect(campaignsForTab(items, 'past').map((row) => row.campaign.id)).toEqual(['archived', 'recent', 'old']);
    });
});

describe('campaignListRows', () => {
    it('compares each campaign with every other one, archived ones included', () => {
        const items = [
            item({ id: 'good', status: 'LIVE' }, { visitors: 100, sales: 6 }),
            item({ id: 'archived', status: 'ARCHIVED', archivedAt: '2026-11-01T00:00:00Z' }, { visitors: 200, sales: 4 }),
        ];
        const [row] = campaignListRows(items, 'current');
        expect(row.item.campaign.id).toBe('good');
        expect(row.verdict).toEqual({ kind: 'better', measure: 'sales', multiple: 3 });
        expect(row.trend).toBe('flat');
    });
});
