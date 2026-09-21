'use client';

import { useCallback, useState } from 'react';

import { useUpdateEventTypeModule } from '@/hooks/useEventTypeModuleMatrix';
import type { EventTypeModuleApplicability } from '@/lib/api/types';

export type PendingApplicabilityChange = {
    moduleKey: string;
    moduleName: string;
    before: EventTypeModuleApplicability;
    after: EventTypeModuleApplicability;
};

// The pill never writes on click: the choice is parked here until the admin
// confirms it in the modal.
export function useModuleApplicabilityChange(eventTypeKey: string) {
    const update = useUpdateEventTypeModule();
    const [pending, setPending] = useState<PendingApplicabilityChange | null>(null);

    const request = useCallback((change: PendingApplicabilityChange) => {
        if (change.before === change.after) return;
        setPending(change);
    }, []);

    const cancel = useCallback(() => {
        update.reset();
        setPending(null);
    }, [update]);

    const confirm = useCallback(async () => {
        if (!pending) return;
        await update.mutateAsync({ eventTypeKey, moduleKey: pending.moduleKey, input: { applicability: pending.after } });
        setPending(null);
    }, [eventTypeKey, pending, update]);

    return { pending, request, cancel, confirm, isSaving: update.isPending, error: update.error };
}
