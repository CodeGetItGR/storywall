'use client';

import { useEffect, useState } from 'react';

import { usePwaInstall } from '@/hooks/usePwaInstall';
import { INSTALL_BANNER_DISMISSED_KEY } from '@/lib/pwaInstall';

const TIP_DURATION_MS = 4000;

type BannerState = 'hidden' | 'offer' | 'tip';

// The feed's one-time install offer. Closing it leaves a short tip pointing at
// the account menu, then it never shows again on this device.
export function useInstallBanner() {
    const pwaInstall = usePwaInstall();
    const [state, setState] = useState<BannerState>('hidden');

    useEffect(() => {
        if (!pwaInstall.canInstall) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the install store; once installed the banner goes.
            setState((current) => (current === 'offer' ? 'hidden' : current));
            return;
        }
        try {
            if (window.localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)) return;
        } catch {
            return;
        }
        setState((current) => (current === 'hidden' ? 'offer' : current));
    }, [pwaInstall.canInstall]);

    useEffect(() => {
        if (state !== 'tip') return;
        const timer = window.setTimeout(() => setState('hidden'), TIP_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [state]);

    function dismiss() {
        try {
            window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, '1');
        } catch {
            // No storage: the banner closes for this visit only.
        }
        setState('tip');
    }

    return { ...pwaInstall, state, dismiss };
}
