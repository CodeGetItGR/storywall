'use client';

import { useEffect } from 'react';

import { isTypingControl } from '@/lib/visualViewport';
import { useMobileChromeActions } from '@/providers/MobileChromeProvider';

const TYPING_HIDE_REASON = 'typing';

// Hides the tab bar while the on-screen keyboard is likely open, like a native app.
export function useHideMobileTabBarWhileTyping() {
    const { hideMobileTabBar, showMobileTabBar } = useMobileChromeActions();

    useEffect(() => {
        const touchScreen = window.matchMedia('(pointer: coarse)');
        let frame: number | null = null;

        function sync() {
            frame = null;
            if (touchScreen.matches && isTypingControl(document.activeElement)) hideMobileTabBar(TYPING_HIDE_REASON);
            else showMobileTabBar(TYPING_HIDE_REASON);
        }

        // Moving between fields fires focusout before focusin: check once both have run.
        function scheduleSync() {
            if (frame === null) frame = window.requestAnimationFrame(sync);
        }

        sync();
        document.addEventListener('focusin', scheduleSync);
        document.addEventListener('focusout', scheduleSync);

        return () => {
            if (frame !== null) window.cancelAnimationFrame(frame);
            document.removeEventListener('focusin', scheduleSync);
            document.removeEventListener('focusout', scheduleSync);
            showMobileTabBar(TYPING_HIDE_REASON);
        };
    }, [hideMobileTabBar, showMobileTabBar]);
}
