import { describe, expect, it } from 'vitest';

import {
    campaignOverviewFixture,
    campaignReportFixture,
    emptyCampaignOverviewFixture,
    oneDayCampaignOverviewFixture,
} from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import {
    campaignFunnelTiles,
    campaignSourceGroups,
    campaignSourceOptions,
    hourLabel,
    pageRows,
    showsHourly,
    UNKNOWN_PAGE,
} from '@/lib/adminCampaignOverview';

describe('campaignFunnelTiles', () => {
    it('lists every count in funnel order, with shares of visitors after Visitors', () => {
        expect(campaignFunnelTiles(campaignOverviewFixture)).toEqual([
            { key: 'visits', value: 1240, share: null },
            { key: 'visitors', value: 1000, share: null },
            { key: 'createClicks', value: 150, share: 0.15 },
            { key: 'plansClicks', value: 60, share: 0.06 },
            { key: 'planPicks', value: 20, share: 0.02 },
            { key: 'signedUp', value: 40, share: 0.04 },
            { key: 'paidHost', value: 10, share: 0.01 },
        ]);
    });

    it('has no shares without visitors', () => {
        expect(campaignFunnelTiles(emptyCampaignOverviewFixture).every((tile) => tile.share === null)).toBe(true);
    });
});

describe('campaignSourceGroups', () => {
    it('adds up the overview rows per source, most visits first', () => {
        const groups = campaignSourceGroups(campaignReportFixture);

        expect(groups.map((group) => group.source)).toEqual(['instagram', 'facebook', 'tiktok']);
        expect(groups[0].rows.map((row) => row.utmMedium)).toEqual(['social', 'story']);
        expect(groups[0].totals).toMatchObject({ visits: 940, visitors: 750, signedUp: 34, paidHost: 10, revenueMinorByCurrency: { EUR: 131000 } });
    });

    it('keeps a picked source the range has nothing for', () => {
        const groups = campaignSourceGroups(campaignReportFixture);
        expect(campaignSourceOptions(groups, 'pinterest')).toEqual(['pinterest', 'instagram', 'facebook', 'tiktok']);
        expect(campaignSourceOptions(groups, 'facebook')).toEqual(['instagram', 'facebook', 'tiktok']);
    });
});

describe('the hourly chart and pages', () => {
    it('shows hours only for a one-day range with visits', () => {
        expect(showsHourly(oneDayCampaignOverviewFixture)).toBe(true);
        expect(showsHourly(campaignOverviewFixture)).toBe(false);
        expect(showsHourly(emptyCampaignOverviewFixture)).toBe(false);
    });

    it('labels hours and keys a missing page as unknown', () => {
        expect(hourLabel(9)).toBe('09:00');
        expect(pageRows(campaignOverviewFixture.pages).map((row) => row.key)).toEqual(['/el', '/for-business', UNKNOWN_PAGE]);
    });
});
