'use client';

import { useEffect } from 'react';

import { useMobileChromeActions } from '@/providers/MobileChromeProvider';

// Hides the phone tab bar for as long as the screen asks, and brings it back on leaving.
export function useHideMobileTabBar(active: boolean, reason: string) {
    const { hideMobileTabBar, showMobileTabBar } = useMobileChromeActions();

    useEffect(() => {
        if (!active) return;
        hideMobileTabBar(reason);
        return () => showMobileTabBar(reason);
    }, [active, hideMobileTabBar, reason, showMobileTabBar]);
}
