'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

interface MobileChromeContextValue {
    hiddenReasons: string[];
    isMobileTabBarHidden: boolean;
    hideMobileTabBar: (reason?: string) => void;
    showMobileTabBar: (reason?: string) => void;
    isComposerFabHidden: boolean;
    hideComposerFab: (reason: string) => void;
    showComposerFab: (reason: string) => void;
}

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);
const DEFAULT_REASON = '__default__';

function addReason(reason: string) {
    return (current: Set<string>) => {
        if (current.has(reason)) return current;
        const next = new Set(current);
        next.add(reason);
        return next;
    };
}

function removeReason(reason: string) {
    return (current: Set<string>) => {
        if (!current.has(reason)) return current;
        const next = new Set(current);
        next.delete(reason);
        return next;
    };
}

export function MobileChromeProvider({ children }: { children: ReactNode }) {
    const [hiddenReasons, setHiddenReasons] = useState<Set<string>>(() => new Set());
    const [fabHiddenReasons, setFabHiddenReasons] = useState<Set<string>>(() => new Set());

    const hideMobileTabBar = useCallback((reason = DEFAULT_REASON) => setHiddenReasons(addReason(reason)), []);
    const showMobileTabBar = useCallback((reason = DEFAULT_REASON) => setHiddenReasons(removeReason(reason)), []);
    const hideComposerFab = useCallback((reason: string) => setFabHiddenReasons(addReason(reason)), []);
    const showComposerFab = useCallback((reason: string) => setFabHiddenReasons(removeReason(reason)), []);

    const value = useMemo<MobileChromeContextValue>(
        () => ({
            hiddenReasons: Array.from(hiddenReasons),
            isMobileTabBarHidden: hiddenReasons.size > 0,
            hideMobileTabBar,
            showMobileTabBar,
            isComposerFabHidden: fabHiddenReasons.size > 0,
            hideComposerFab,
            showComposerFab,
        }),
        [hiddenReasons, fabHiddenReasons, hideMobileTabBar, showMobileTabBar, hideComposerFab, showComposerFab],
    );

    return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
}

export function useMobileChrome() {
    const context = useContext(MobileChromeContext);
    if (!context) {
        throw new Error('useMobileChrome must be used within a MobileChromeProvider');
    }
    return context;
}
