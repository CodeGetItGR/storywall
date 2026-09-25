'use client';

import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { routes } from '@/lib/routes';

// Modules follow the plan, so an unavailable module points the host at the
// plan's upgrade options. Only the main host can buy (4006 otherwise).
export function usePlanUpgradeHref(eventId: string): string | null {
    const isPrimaryHost = useIsPrimaryHost();
    return isPrimaryHost ? routes.events.manage(eventId, { tab: 'plan' }) : null;
}
