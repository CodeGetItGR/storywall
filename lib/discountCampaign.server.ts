import { endpoints } from '@/lib/api/endpoints';
import type { DiscountCampaignLiveDto } from '@/lib/api/types';

// Server-only: the live discount campaign from Spring, cached for a minute in Next's data cache. When
// Spring fails, the last good copy this server instance saw is served instead; the browser still
// hides it at its end. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;

let lastGood: DiscountCampaignLiveDto | null = null;

export async function fetchLiveDiscountCampaign(): Promise<DiscountCampaignLiveDto | null> {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.discountCampaign.live}`, {
            next: { revalidate: REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.status === 204) {
            lastGood = null;
            return null;
        }
        if (!res.ok) return lastGood;
        lastGood = (await res.json()) as DiscountCampaignLiveDto;
        return lastGood;
    } catch {
        return lastGood;
    }
}
