'use client';

import { useState, useSyncExternalStore } from 'react';

import { getPwaInstallMode, getServerPwaInstallMode, promptPwaInstall, subscribePwaInstall } from '@/lib/pwaInstall';

// Whether the app can be installed here, and the action that does it: the
// browser's own dialog, or the iPhone steps sheet.
export function usePwaInstall() {
    const mode = useSyncExternalStore(subscribePwaInstall, getPwaInstallMode, getServerPwaInstallMode);
    const [iosGuideOpen, setIosGuideOpen] = useState(false);

    function install() {
        if (mode === 'prompt') void promptPwaInstall();
        else if (mode === 'ios') setIosGuideOpen(true);
    }

    function closeIosGuide() {
        setIosGuideOpen(false);
    }

    return { canInstall: mode !== null, install, iosGuideOpen, closeIosGuide };
}
