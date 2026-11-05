'use client';

import { useEffect, useState } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { nextCampaignBoundary } from '@/lib/billing';

// setTimeout fires at once for anything longer than this.
const MAX_TIMEOUT_MS = 2_147_483_647;

type Ticked = { source: PlanTierResponseDto[]; plans: PlanTierResponseDto[] };

// The same plans, as a new array each time a campaign on one of them starts or ends. Prices are worked
// out from the clock, so a screen that builds them in a memo takes its plans from here and rebuilds on
// time instead of waiting for the next refetch; one that works them out as it renders only needs the
// re-render. A refetch hands back its own plans at once.
export function useCampaignPriceClock(plans: PlanTierResponseDto[] | undefined): PlanTierResponseDto[] | undefined {
    const [ticked, setTicked] = useState<Ticked | null>(null);

    useEffect(() => {
        const next = plans ? nextCampaignBoundary(plans) : null;
        if (!plans || next === null) return;
        const timer = setTimeout(() => setTicked({ source: plans, plans: [...plans] }), Math.min(Math.max(next - Date.now(), 0), MAX_TIMEOUT_MS));
        return () => clearTimeout(timer);
    }, [plans, ticked]);

    return ticked && ticked.source === plans ? ticked.plans : plans;
}
