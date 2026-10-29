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
    campaignVisitorsChart,
    CHART_SLOTS,
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

describe('campaignVisitorsChart', () => {
    it('has a line per source, biggest first, with zeros on days without visits', () => {
        const chart = campaignVisitorsChart(campaignOverviewFixture, false);

        expect(chart.lines.map((line) => [line.series, line.visitors, line.slot])).toEqual([
            ['instagram', 25, 1],
            ['facebook', 8, 0],
        ]);
        expect(chart.rows).toEqual([
            { x: '2027-03-01', s0: 25, s1: 8 },
            { x: '2027-03-02', s0: 0, s1: 0 },
        ]);
    });

    it('uses the hours for a one-day range', () => {
        const chart = campaignVisitorsChart(oneDayCampaignOverviewFixture, true);
        expect(chart.rows).toHaveLength(24);
        expect(chart.rows[9]).toEqual({ x: 9, s0: 25, s1: 8 });
    });

    it('adds the smallest lines into Other past the palette', () => {
        const dailySeries = Array.from({ length: CHART_SLOTS + 2 }, (_, index) => ({
            series: `source-${index}`,
            date: '2027-03-01',
            visits: 100 - index,
            visitors: 100 - index,
        }));
        const chart = campaignVisitorsChart({ ...campaignOverviewFixture, dailySeries }, false);

        expect(chart.lines).toHaveLength(CHART_SLOTS);
        expect(chart.lines.at(-1)).toMatchObject({ dataKey: 'other', other: true, slot: -1, visitors: 93 + 92 + 91 });
        expect(chart.rows[0].other).toBe(93 + 92 + 91);
    });

    it('is the single total line without series', () => {
        const chart = campaignVisitorsChart({ ...campaignOverviewFixture, dailySeries: [] }, false);
        expect(chart.lines).toEqual([{ dataKey: 'total', series: null, other: false, slot: 0, visitors: 33 }]);
        expect(chart.rows[0]).toEqual({ x: '2027-03-01', total: 33 });
    });
});
