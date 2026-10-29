import { endpoints } from '@/lib/api/endpoints';
import type { SiteNoticeLiveDto } from '@/lib/api/types';

// Server-only: the live site notices from Spring, cached for a minute in Next's data cache. When
// Spring fails, the last good copy this server instance saw is served instead, so notices published
// before an outage keep showing during it. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
export const SITE_NOTICES_REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;

let lastGood: SiteNoticeLiveDto[] = [];

export async function fetchLiveSiteNotices(): Promise<SiteNoticeLiveDto[]> {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.siteNotices.live}`, {
            next: { revalidate: SITE_NOTICES_REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return lastGood;
        const body: unknown = await res.json();
        if (!Array.isArray(body)) return lastGood;
        lastGood = body as SiteNoticeLiveDto[];
        return lastGood;
    } catch {
        return lastGood;
    }
}
