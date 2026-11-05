import { endpoints } from '@/lib/api/endpoints';
import type { CampaignLinkTargetDto } from '@/lib/api/types';

// Server-only: where a campaign short address leads, cached for a minute in Next's data cache, since
// every visitor reaches Spring from this server's address. Null when the code is unknown or Spring
// can't answer. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;
const SHORT_CODE = /^[a-z0-9-]{1,310}$/;

export async function fetchCampaignLinkTarget(rawCode: string): Promise<CampaignLinkTargetDto | null> {
    const code = rawCode.toLowerCase();
    if (!SHORT_CODE.test(code)) return null;
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.campaignLinks.target(code)}`, {
            next: { revalidate: REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return res.ok ? ((await res.json()) as CampaignLinkTargetDto) : null;
    } catch {
        return null;
    }
}
