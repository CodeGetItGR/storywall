import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventUsage } from '@/hooks/useUsage';
import { eventModuleCount } from '@/lib/planModuleConfig';
import { findPlanByCode } from '@/lib/planTiers';
import { useActiveEvent } from '@/providers/EventProvider';

// The event's schedule.maxSections (the main session counts): its module config, which has an
// admin's extra, else the plan's from GET /api/config. Neither means no cap here; the server's
// 409 5067 still applies. See event-type-feature-toggles-quotas-fe-integration.md §3.
export function useScheduleSessionLimit(eventId: string | null, enabled: boolean, sessionCount: number) {
    const t = useTranslations('SchedulePage.host.sessionManagement');
    const { data: appConfig } = useAppConfig();
    const activeEvent = useActiveEvent();
    const { data: usage } = useEventUsage(enabled ? eventId : null);
    const plan = usage && appConfig ? findPlanByCode(appConfig.planTiers, 'EVENT', usage.planTier) : undefined;
    const modules = activeEvent?.id === eventId ? activeEvent.modules : undefined;
    const maxSections = eventModuleCount(modules, plan, 'schedule', 'maxSections');
    const atSessionLimit = maxSections !== null && sessionCount >= maxSections;

    return {
        atSessionLimit,
        sessionLimitMessage: atSessionLimit ? t('sessionLimitReached', { max: maxSections }) : undefined,
    };
}
