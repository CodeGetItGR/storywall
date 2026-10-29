import { describe, expect, it } from 'vitest';

import { campaignOverviewFixture, emptyCampaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { campaignFunnelTiles } from '@/lib/adminCampaignOverview';

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
