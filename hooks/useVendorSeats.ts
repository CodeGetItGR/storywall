'use client';

import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { eventModuleCount, planModuleCount } from '@/lib/planModuleConfig';
import { findPlanByCode } from '@/lib/planTiers';
import { useActiveEvent } from '@/providers/EventProvider';

// The event's vendors.maxVendors (its module config, live from the plan with an admin's extra) against
// the joined vendors, hidden ones included: the server counts every vendor who hasn't been removed.
// No cap here (modules not loaded) means no count; the server's 409 VENDOR_LIMIT_REACHED still applies.
export function useVendorSeats(eventId: string, used: number) {
    const t = useTranslations('Vendors.manage');
    const activeEvent = useActiveEvent();
    const modules = activeEvent?.id === eventId ? activeEvent.modules : undefined;
    const limit = eventModuleCount(modules, undefined, 'vendors', 'maxVendors');
    const isFull = limit !== null && used >= limit;

    // The upgrade hint is the main host's: only they can buy (the options are 403 for a co-host).
    const isPrimaryHost = useIsPrimaryHost();
    const { data: appConfig } = useAppConfig();
    const { data: upgradeOptions = [] } = useUpgradeOptions(eventId, isFull && isPrimaryHost);
    const nextOption = upgradeOptions[0];
    const nextPlan = nextOption && appConfig ? findPlanByCode(appConfig.planTiers, 'EVENT', nextOption.planTierCode) : undefined;
    const nextLimit = nextPlan?.moduleKeys.includes('vendors') ? planModuleCount(nextPlan, 'vendors', 'maxVendors') : null;

    let fullNotice: string | null = null;
    if (isFull) {
        fullNotice =
            nextPlan && nextLimit !== null && nextLimit > limit ? t('fullWithUpgrade', { plan: nextPlan.name, count: nextLimit }) : t('full');
    }

    return {
        used,
        limit,
        isFull,
        seatsLabel: limit === null ? null : t('seats', { used, max: limit }),
        fullNotice,
    };
}
