'use client';

import { useEventBilling } from '@/hooks/useBilling';
import { useEventGift } from '@/hooks/useGift';
import type { EventModuleResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { isPlanGiftable } from '@/lib/gift';

/**
 * Whether the host dashboard shows "Given as a gift": always on a gift event,
 * and for the primary host when the event's plan can be given (so they can set
 * one up). Only the primary host needs the plan, read from billing.
 */
export function useGiftSection(
    eventId: string | null,
    { isPrimaryHost, eventModules, planTiers }: { isPrimaryHost: boolean; eventModules: EventModuleResponseDto[]; planTiers: PlanTierResponseDto[] },
) {
    const gift = useEventGift(eventId);
    const canOffer = isPrimaryHost && gift.data === null && isModuleAvailable(eventModules, 'co_hosts');
    const billing = useEventBilling(eventId, canOffer);
    const plan = planTiers.find((tier) => tier.scope === 'EVENT' && tier.code === billing.data?.planTierCode);

    return {
        gift: gift.data ?? null,
        available: Boolean(gift.data) || (canOffer && isPlanGiftable(plan)),
        isLoading: gift.isLoading || (canOffer && billing.isLoading),
    };
}
