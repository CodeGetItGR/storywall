import { endpoints } from '@/lib/api/endpoints';
import type { DiscountCampaignLiveDto, DiscountCampaignLiveResponseDto } from '@/lib/api/types';

// Server-only: the live discount campaign from Spring, cached for a minute in Next's data cache. Spring
// always answers 200 with { campaign }, null without one, because only 200s are stored in that cache.
// When Spring fails, the last good copy this server instance saw is served instead. A campaign past
// its end is never returned. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;

let lastGood: DiscountCampaignLiveDto | null = null;

function unlessEnded(campaign: DiscountCampaignLiveDto | null): DiscountCampaignLiveDto | null {
    return campaign && Date.parse(campaign.endsAt) > Date.now() ? campaign : null;
}

export async function fetchLiveDiscountCampaign(): Promise<DiscountCampaignLiveDto | null> {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.discountCampaign.live}`, {
            next: { revalidate: REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return unlessEnded(lastGood);
        lastGood = ((await res.json()) as DiscountCampaignLiveResponseDto).campaign;
        return unlessEnded(lastGood);
    } catch {
        return unlessEnded(lastGood);
    }
}
