'use client';

import { useEffect, useState } from 'react';

// The device's own share sheet (phones, mostly). `canShare` stays false on the
// server and on browsers without the Web Share API, so callers can hide the action.
export function useNativeShare(url: string, title?: string) {
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only feature detection, not derived from render state.
        setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
    }, []);

    async function share() {
        try {
            await navigator.share({ title, url });
        } catch {
            // User cancelled the share sheet — nothing to do.
        }
    }

    return { canShare, share };
}
