'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

interface MobileChromeContextValue {
    hiddenReasons: string[];
    isMobileTabBarHidden: boolean;
    hideMobileTabBar: (reason?: string) => void;
    showMobileTabBar: (reason?: string) => void;
}

const MobileChromeContext = createContext<MobileChromeContextValue | null>(null);
const DEFAULT_REASON = '__default__';

export function MobileChromeProvider({ children }: { children: ReactNode }) {
    const [hiddenReasons, setHiddenReasons] = useState<Set<string>>(() => new Set());

    const hideMobileTabBar = useCallback((reason = DEFAULT_REASON) => {
        setHiddenReasons((current) => {
            if (current.has(reason)) return current;
            const next = new Set(current);
            next.add(reason);
            return next;
        });
    }, []);

    const showMobileTabBar = useCallback((reason = DEFAULT_REASON) => {
        setHiddenReasons((current) => {
            if (!current.has(reason)) return current;
            const next = new Set(current);
            next.delete(reason);
            return next;
        });
    }, []);

    const value = useMemo<MobileChromeContextValue>(
        () => ({
            hiddenReasons: Array.from(hiddenReasons),
            isMobileTabBarHidden: hiddenReasons.size > 0,
            hideMobileTabBar,
            showMobileTabBar,
        }),
        [hiddenReasons, hideMobileTabBar, showMobileTabBar]
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
