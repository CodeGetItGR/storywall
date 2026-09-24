'use client';

import { useMemo } from 'react';

import { useEventBilling } from '@/hooks/useBilling';
import type {
    EventModuleResponseDto,
    EventStatus,
    EventUsageResponseDto,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { discountedAmountMinor } from '@/lib/billing';
import { findPlanByCode, liveInitialOptions } from '@/lib/planTiers';

/**
 * Plan, add-on and activation-price facts the host dashboard overview renders.
 * Kept out of the component so the overview stays a render shell.
 */
export function useEventOverviewPlan({
    eventId,
    eventStatus,
    eventUsage,
    planTiers,
    paidServices,
    modules,
    eventModules,
}: {
    eventId: string;
    eventStatus: EventStatus;
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventModules: EventModuleResponseDto[];
}) {
    const billing = useEventBilling(eventId, eventStatus === 'DRAFT');

    return useMemo(() => {
        const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
        const selectedAddons = billing.data?.addons ?? [];
        const activeAddonCodes = new Set(selectedAddons.map((addon) => addon.code));
        // The draft's duration comes from the billing view; the event response
        // doesn't carry it. Public plans list live durations only, so a
        // duration retired since it was picked is simply not found.
        const durationOptions = currentPlan ? liveInitialOptions(currentPlan) : [];
        const savedOptionId = billing.data?.coverageOptionId ?? null;
        const currentOption = durationOptions.find((option) => option.id === savedOptionId) ?? null;
        const durationUnavailable = Boolean(currentPlan && billing.data && !currentOption);
        const moduleUnlocks = paidServices.filter(
            (service) =>
                service.kind === 'MODULE_UNLOCK' &&
                service.grantsModuleKey &&
                !currentPlan?.moduleKeys.includes(service.grantsModuleKey) &&
                (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false)),
        );
        // Activation charges the draft's duration, after the plan's promotion,
        // plus any module unlocks the draft opted into.
        const activationTotal =
            !currentPlan || !currentOption
                ? null
                : discountedAmountMinor(currentOption.priceAmountMinor, currentPlan) +
                  moduleUnlocks.filter((service) => activeAddonCodes.has(service.code)).reduce((sum, service) => sum + service.priceAmountMinor, 0);

        const enabledModuleKeys = new Set(modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey));
        const availableModuleKeys = new Set(eventModules.filter((module_) => module_.isAvailable).map((module_) => module_.moduleKey));

        return {
            currentPlan,
            currentOption,
            savedOptionId,
            durationOptions,
            durationUnavailable,
            selectedAddons,
            activationTotal,
            isBillingLoading: billing.isLoading,
            wishlistAvailable: availableModuleKeys.has('wishlist') || moduleUnlocks.some((service) => activeAddonCodes.has(service.code)),
            includedModuleKeys:
                currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [],
        };
    }, [billing.data, billing.isLoading, eventModules, eventUsage, modules, paidServices, planTiers]);
}
