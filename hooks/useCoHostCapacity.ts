import { useTranslations } from 'next-intl';

import type { EventHostResponseDto, EventModuleResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { coHostCapacity, planModuleCount } from '@/lib/planModuleConfig';

// The event's co-host cap (its module config, else its plan), plus the notice to show once it is
// reached. Neither (archived, not public plan) means no cap here; the server's 409 still applies.
export function useCoHostCapacity(
    hosts: EventHostResponseDto[],
    currentPlan: PlanTierResponseDto | undefined,
    nextPlan: PlanTierResponseDto | undefined,
    modules: EventModuleResponseDto[] | undefined,
) {
    const t = useTranslations('ManagePage.invitations.coHosts');
    const capacity = coHostCapacity(hosts, currentPlan, modules);
    const nextLimit = planModuleCount(nextPlan, 'co_hosts', 'maxCoHosts');
    const upgradeRaisesLimit = nextPlan !== undefined && (nextLimit === null || (capacity.limit !== null && nextLimit > capacity.limit));

    let fullNotice: string | null = null;
    if (capacity.isFull) {
        if (!upgradeRaisesLimit) fullNotice = t('full');
        else if (nextLimit === null) fullNotice = t('fullWithUnlimitedUpgrade', { plan: nextPlan.name });
        else fullNotice = t('fullWithUpgrade', { plan: nextPlan.name, count: nextLimit });
    }

    return {
        ...capacity,
        percent: capacity.limit ? (capacity.used / capacity.limit) * 100 : capacity.isFull ? 100 : 0,
        valueLabel: capacity.limit === null ? `${capacity.used}` : `${capacity.used} / ${capacity.limit}`,
        fullNotice,
    };
}
