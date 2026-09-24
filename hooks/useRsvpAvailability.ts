import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { findPlansUnlockingModule } from '@/lib/planTiers';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

/**
 * Whether the active event's plan includes RSVP. `isUnavailable` is only true
 * once the event has loaded, so a page never flashes the notice while loading.
 * Hosts are told which plans unlock it; guests just see that it's off.
 */
export function useRsvpAvailability() {
    const t = useTranslations('RSVPPage');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const { data: appConfig } = useAppConfig();

    const isAvailable = isModuleAvailable(activeEvent?.modules, 'rsvp');
    const unlockPlanNames = isHost
        ? findPlansUnlockingModule(appConfig?.planTiers ?? [], 'rsvp')
              .map((plan) => plan.name)
              .join(', ')
        : '';

    return {
        isAvailable,
        isUnavailable: Boolean(activeEvent) && !isAvailable,
        unavailableTitle: t('unavailableTitle'),
        unavailableBody: unlockPlanNames ? t('unavailableUpgradeBody', { plans: unlockPlanNames }) : t('moduleUnavailable'),
    };
}
