'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';

import { getHasOpenOverlay, registerOverlayPresence, subscribeOverlayPresence } from '@/lib/overlayPresence';

function getServerSnapshot() {
    return false;
}

// Marks this component's overlay as open for as long as `open` is true.
export function useRegisterOverlayPresence(open: boolean) {
    const id = useId();

    useEffect(() => {
        if (!open) return;
        return registerOverlayPresence(id);
    }, [id, open]);
}

export function useHasOpenOverlay(): boolean {
    return useSyncExternalStore(subscribeOverlayPresence, getHasOpenOverlay, getServerSnapshot);
}
