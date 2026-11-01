'use client';

import { useMemo } from 'react';

import { useMyVendorRole } from '@/hooks/useVendors';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { vendorQuickActions } from '@/lib/vendors';
import { useActiveEvent } from '@/providers/EventProvider';

// The signed-in vendor's quick actions on the feed. Empty for hosts, guests and vendors with no open tools.
export function useVendorQuickActions(eventId: string, isHost: boolean) {
    const activeEvent = useActiveEvent();
    // A host is never a vendor (Jira KAN-35), so the host skips the role request.
    const role = useMyVendorRole(isHost ? null : eventId);
    const me = role.data ?? null;

    return useMemo(() => {
        if (!me || !activeEvent) return [];
        return vendorQuickActions(eventId, me, readableModuleKeys(activeEvent), activeEvent.schedule.startAt);
    }, [activeEvent, eventId, me]);
}
