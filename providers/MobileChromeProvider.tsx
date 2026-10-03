'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

interface MobileChromeActions {
    hideMobileTabBar: (reason?: string) => void;
    showMobileTabBar: (reason?: string) => void;
    hideComposerFab: (reason: string) => void;
    showComposerFab: (reason: string) => void;
}

interface MobileChromeContextValue extends MobileChromeActions {
    hiddenReasons: string[];
    isMobileTabBarHidden: boolean;
    isComposerFabHidden: boolean;
}

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);
// The actions never change, so a screen that only hides or shows the chrome
// (the feed hides the tab bar on every scroll) doesn't re-render when it toggles.
const MobileChromeActionsContext = createContext<MobileChromeActions | null>(null);
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

    const actions = useMemo<MobileChromeActions>(
        () => ({ hideMobileTabBar, showMobileTabBar, hideComposerFab, showComposerFab }),
        [hideMobileTabBar, showMobileTabBar, hideComposerFab, showComposerFab],
    );

    const value = useMemo<MobileChromeContextValue>(
        () => ({
            ...actions,
            hiddenReasons: Array.from(hiddenReasons),
            isMobileTabBarHidden: hiddenReasons.size > 0,
            isComposerFabHidden: fabHiddenReasons.size > 0,
        }),
        [actions, hiddenReasons, fabHiddenReasons],
    );

    return (
        <MobileChromeActionsContext.Provider value={actions}>
            <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>
        </MobileChromeActionsContext.Provider>
    );
}

export function useMobileChrome() {
    const context = useContext(MobileChromeContext);
    if (!context) {
        throw new Error('useMobileChrome must be used within a MobileChromeProvider');
    }
    return context;
}

// For screens that only hide or show the chrome: never re-renders them.
export function useMobileChromeActions() {
    const context = useContext(MobileChromeActionsContext);
    if (!context) {
        throw new Error('useMobileChromeActions must be used within a MobileChromeProvider');
    }
    return context;
}
