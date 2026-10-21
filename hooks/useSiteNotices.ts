import { useQuery } from '@tanstack/react-query';

import type { SiteNoticeLiveDto } from '@/lib/api/types';

// The live site notices. Seeded on the server by both root layouts; refetched on focus and every
// five minutes so a new outage notice reaches open tabs. Reads the app's own cached route, never
// Spring directly, so an outage doesn't count against lib/apiHealth.ts twice.

export const siteNoticeKeys = {
    live: () => ['site-notices', 'live'] as const,
};

const SITE_NOTICES_URL = '/api/site-notices';
const STALE_MS = 60 * 1000;
const REFETCH_MS = 5 * 60 * 1000;

async function fetchSiteNotices(): Promise<SiteNoticeLiveDto[]> {
    const res = await fetch(SITE_NOTICES_URL);
    if (!res.ok) throw new Error(`Site notices failed with status ${res.status}`);
    return (await res.json()) as SiteNoticeLiveDto[];
}

export function useSiteNotices() {
    return useQuery({
        queryKey: siteNoticeKeys.live(),
        queryFn: fetchSiteNotices,
        staleTime: STALE_MS,
        refetchInterval: REFETCH_MS,
        refetchOnWindowFocus: true,
    });
}
