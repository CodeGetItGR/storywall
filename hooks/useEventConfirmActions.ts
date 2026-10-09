'use client';

import { useCallback } from 'react';

import { useLiftEventSuspensionById, useRemoveAdminEventAddon, useRevokeEventModule } from '@/hooks/useAdminEvents';
import type { EventOverlay } from '@/hooks/useEventDetailOverlays';

// Closes on success; a refusal stays on the modal as the mutation's error.
async function settle(request: Promise<unknown>, onDoneAction: () => void) {
    try {
        await request;
        onDoneAction();
    } catch {
        // Shown from the mutation's error.
    }
}

// The one-click actions behind a plain confirmation: take back a module, remove an add-on, lift a suspension.
export function useEventConfirmActions(eventId: string, overlay: EventOverlay | null, onDoneAction: () => void) {
    const revoke = useRevokeEventModule(eventId);
    const removeAddon = useRemoveAdminEventAddon(eventId);
    const lift = useLiftEventSuspensionById(eventId);

    const confirmRevoke = useCallback(async () => {
        if (overlay?.kind !== 'revokeModule') return;
        await settle(revoke.mutateAsync(overlay.moduleKey), onDoneAction);
    }, [onDoneAction, overlay, revoke]);

    const confirmRemoveAddon = useCallback(async () => {
        if (overlay?.kind !== 'removeAddon') return;
        await settle(removeAddon.mutateAsync(overlay.code), onDoneAction);
    }, [onDoneAction, overlay, removeAddon]);

    const confirmLift = useCallback(async () => {
        await settle(lift.mutateAsync(), onDoneAction);
    }, [lift, onDoneAction]);

    // A refusal stays on the modal it came from; closing it forgets the error for next time.
    const reset = useCallback(() => {
        revoke.reset();
        removeAddon.reset();
        lift.reset();
        onDoneAction();
    }, [lift, onDoneAction, removeAddon, revoke]);

    return {
        revoke: { confirm: confirmRevoke, isPending: revoke.isPending, error: revoke.error },
        removeAddon: { confirm: confirmRemoveAddon, isPending: removeAddon.isPending, error: removeAddon.error },
        lift: { confirm: confirmLift, isPending: lift.isPending, error: lift.error },
        close: reset,
    };
}
