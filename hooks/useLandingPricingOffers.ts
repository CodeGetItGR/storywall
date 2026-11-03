'use client';

import { useMemo } from 'react';

import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';

// Whether the landing pricing picker offers this event type slug, so a link to it can hide while it has no plans.
export function useLandingPricingOffers(eventTypeSlug: string): boolean {
    const { groups } = useLandingPricingPlans();
    return useMemo(() => (groups ?? []).some((group) => group.items.some((item) => item.id === eventTypeSlug)), [groups, eventTypeSlug]);
}
