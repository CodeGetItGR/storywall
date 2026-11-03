'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { DiscountCampaignLiveDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// The live discount campaign, null from the second it ends. Seeded on the server by both root
// layouts; refetched on focus and every five minutes. Reads the app's own cached route.

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
    const { data } = useQuery({
        queryKey: discountCampaignKeys.live(),
        queryFn: fetchCampaign,
        staleTime: STALE_MS,
        refetchInterval: REFETCH_MS,
        refetchOnWindowFocus: true,
    });
    const [now, setNow] = useState(() => Date.now());
    const endsAt = data ? Date.parse(data.endsAt) : null;

    useEffect(() => {
        if (endsAt === null || endsAt <= now) return;
        const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(endsAt - Date.now(), 0), MAX_TIMEOUT_MS));
        return () => clearTimeout(timer);
    }, [endsAt, now]);

    return data && endsAt !== null && endsAt > now ? data : null;
}
