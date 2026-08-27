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
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';

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
        const nextPlan = eventUsage ? findNextPlan(planTiers, 'EVENT', eventUsage.planTier) : undefined;
        const selectedAddons = billing.data?.addons ?? [];
        const activeAddonCodes = new Set(selectedAddons.map((addon) => addon.code));
        const originalsService = paidServices.find(
            (service) =>
                service.code === 'ORIGINALS' &&
                service.kind === 'RECURRING_ADDON' &&
                (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false))
        );
        const originalsActive = activeAddonCodes.has('ORIGINALS');
        const moduleUnlocks = paidServices.filter(
            (service) =>
                service.kind === 'MODULE_UNLOCK' &&
                service.grantsModuleKey &&
                !currentPlan?.moduleKeys.includes(service.grantsModuleKey) &&
                (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false))
        );
        const activationAddonAmount = originalsService ? originalsService.priceAmountMinor : 0;
        const activationTotal =
            currentPlan?.priceAmountMinor === null || currentPlan?.priceAmountMinor === undefined
                ? null
                : discountedAmountMinor(currentPlan.priceAmountMinor, currentPlan) +
                  (originalsActive ? activationAddonAmount : 0) +
                  moduleUnlocks.filter((service) => activeAddonCodes.has(service.code)).reduce((sum, service) => sum + service.priceAmountMinor, 0);

        const enabledModuleKeys = new Set(modules.filter((module_) => module_.isEnabled).map((module_) => module_.moduleKey));
        const availableModuleKeys = new Set(eventModules.filter((module_) => module_.isAvailable).map((module_) => module_.moduleKey));

        return {
            currentPlan,
            nextPlan,
            selectedAddons,
            activationTotal,
            wishlistAvailable: availableModuleKeys.has('wishlist') || moduleUnlocks.some((service) => activeAddonCodes.has(service.code)),
            includedModuleKeys:
                currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [],
        };
    }, [billing.data?.addons, eventModules, eventUsage, modules, paidServices, planTiers]);
}
