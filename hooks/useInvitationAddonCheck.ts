'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { APP_CONFIG_STALE_TIME, appConfigKeys, fetchAppConfig } from '@/hooks/useAppConfig';
import { billingKeys, fetchEventBilling, fetchEventWithdrawals, withdrawalKeys } from '@/hooks/useBilling';
import { eventKeys, fetchEventDetail } from '@/hooks/useEvent';
import { eventModuleKeys, fetchEventModules } from '@/hooks/useEventModules';
import { fetchMyEvents, myEventsKeys } from '@/hooks/useMyEvents';
import { INCIDENT_MODE } from '@/lib/incident';
import { isPrimaryHostOf, opensInvitationAddonStep } from '@/lib/invitation/addonStep';
import { useContentAccessMode } from '@/providers/EventProvider';

/**
 * Asks whether Publish shows the add-on step for an event (KAN-82): its plan sells a Save my date
 * add-on the event lacks, and the host may buy it now. Like the event's own pages, only the main
 * host buys, and never in the demo. The reads land in the cache the step itself uses. Any failure
 * answers no, and Publish goes on as before.
 */
export function useInvitationAddonCheck() {
    const queryClient = useQueryClient();
    const isDemo = useContentAccessMode() === 'demoVisitor';

    return useCallback(
        async (eventId: string): Promise<boolean> => {
            if (INCIDENT_MODE || isDemo) return false;
            try {
                const [memberships, event] = await Promise.all([
                    queryClient.fetchQuery({ queryKey: myEventsKeys.all, queryFn: fetchMyEvents }),
                    queryClient.fetchQuery({ queryKey: eventKeys.detail(eventId), queryFn: () => fetchEventDetail(eventId) }),
                ]);
                if (!isPrimaryHostOf(eventId, memberships, event)) return false;
                const [config, billing, eventModules, withdrawals] = await Promise.all([
                    queryClient.fetchQuery({ queryKey: appConfigKeys.all, queryFn: fetchAppConfig, staleTime: APP_CONFIG_STALE_TIME }),
                    queryClient.fetchQuery({ queryKey: billingKeys.event(eventId), queryFn: () => fetchEventBilling(eventId), staleTime: 0 }),
                    queryClient.fetchQuery({ queryKey: eventModuleKeys.list(eventId), queryFn: () => fetchEventModules(eventId), staleTime: 0 }),
                    queryClient.fetchQuery({
                        queryKey: withdrawalKeys.history(eventId),
                        queryFn: () => fetchEventWithdrawals(eventId),
                        staleTime: 0,
                    }),
                ]);
                return opensInvitationAddonStep({
                    paidServices: config.paidServices,
                    platformModules: config.modules,
                    planTiers: config.planTiers,
                    billing,
                    eventModules,
                    withdrawals,
                });
            } catch {
                return false;
            }
        },
        [isDemo, queryClient],
    );
}
