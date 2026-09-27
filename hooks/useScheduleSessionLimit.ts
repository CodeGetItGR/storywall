import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventUsage } from '@/hooks/useUsage';
import { planModuleCount } from '@/lib/planModuleConfig';
import { findPlanByCode } from '@/lib/planTiers';

// The event plan's schedule.maxSections, read live from GET /api/config (the
// main session counts). No plan found or no key means no cap here; the
// server's 409 5067 still applies. See
// event-type-feature-toggles-quotas-fe-integration.md §3.
export function useScheduleSessionLimit(eventId: string | null, enabled: boolean, sessionCount: number) {
    const t = useTranslations('SchedulePage.host.sessionManagement');
    const { data: appConfig } = useAppConfig();
    const { data: usage } = useEventUsage(enabled ? eventId : null);
    const plan = usage && appConfig ? findPlanByCode(appConfig.planTiers, 'EVENT', usage.planTier) : undefined;
    const maxSections = planModuleCount(plan, 'schedule', 'maxSections');
    const atSessionLimit = maxSections !== null && sessionCount >= maxSections;

    return {
        atSessionLimit,
        sessionLimitMessage: atSessionLimit ? t('sessionLimitReached', { max: maxSections }) : undefined,
    };
}
