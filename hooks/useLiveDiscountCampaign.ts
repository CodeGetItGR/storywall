'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import type { DiscountCampaignLiveDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// The live discount campaign, null from the second it ends. Seeded on the server by both root
// layouts; refetched on focus and every five minutes. Reads the app's own cached route. The
// hydrating render uses the data as seeded; the end check starts right after, as the browser's clock
// can differ from the server's.

const CAMPAIGN_URL = '/api/discount-campaign';
const STALE_MS = 60 * 1000;
const REFETCH_MS = 5 * 60 * 1000;
// setTimeout fires at once for anything longer than this.
const MAX_TIMEOUT_MS = 2_147_483_647;

async function fetchCampaign(): Promise<DiscountCampaignLiveDto | null> {
    const res = await fetch(CAMPAIGN_URL);
    if (!res.ok) throw new Error(`Discount campaign failed with status ${res.status}`);
    return (await res.json()) as DiscountCampaignLiveDto | null;
}

export function useLiveDiscountCampaign(): DiscountCampaignLiveDto | null {
    const hydrated = useIsHydrated();
    const { data } = useQuery({
        queryKey: discountCampaignKeys.live(),
        queryFn: fetchCampaign,
        staleTime: STALE_MS,
        refetchInterval: REFETCH_MS,
        refetchOnWindowFocus: true,
    });
    const queryClient = useQueryClient();
    const [now, setNow] = useState(() => Date.now());
    const endsAt = data ? Date.parse(data.endsAt) : null;

    // Prices come from the app config, so an open page needs a new copy when an admin starts or stops a
    // campaign. undefined means nothing has loaded yet, which is not a change.
    const campaignId = data === undefined ? undefined : (data?.id ?? null);
    const seenCampaignId = useRef(campaignId);
    useEffect(() => {
        if (campaignId === seenCampaignId.current) return;
        const hadLoaded = seenCampaignId.current !== undefined;
        seenCampaignId.current = campaignId;
        if (hadLoaded) void queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    }, [campaignId, queryClient]);

    useEffect(() => {
        if (endsAt === null || endsAt <= now) return;
        const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(endsAt - Date.now(), 0), MAX_TIMEOUT_MS));
        return () => clearTimeout(timer);
    }, [endsAt, now]);

    if (!hydrated) return data ?? null;
    return data && endsAt !== null && endsAt > now ? data : null;
}
