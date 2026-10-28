import { rateOf } from '@/lib/adminFunnel';
import type { CampaignOverviewDto } from '@/lib/api/types';

export type CampaignFunnelKey = 'visits' | 'visitors' | 'createClicks' | 'plansClicks' | 'planPicks' | 'signedUp' | 'paidHost';

export type CampaignFunnelTile = { key: CampaignFunnelKey; value: number; share: number | null };

const FUNNEL_KEYS: readonly CampaignFunnelKey[] = ['visits', 'visitors', 'createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost'];

// Every step after Visitors also shows its share of visitors.
const SHARE_OF_VISITORS = new Set<CampaignFunnelKey>(['createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost']);

export function campaignFunnelTiles(data: CampaignOverviewDto): CampaignFunnelTile[] {
    return FUNNEL_KEYS.map((key) => ({
        key,
        value: data[key],
        share: SHARE_OF_VISITORS.has(key) ? rateOf(data[key], data.visitors) : null,
    }));
}
