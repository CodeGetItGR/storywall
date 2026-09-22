'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'storywall:landing-motion-paused';

// Session storage keeps the choice across in-page navigation; the in-memory
// copy is the fallback when a private-mode browser denies it.
let memoryValue = false;
const listeners = new Set<() => void>();

function readPaused(): boolean {
    try {
        return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return memoryValue;
    }
}

function writePaused(next: boolean) {
    memoryValue = next;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, String(next));
    } catch {
        // Denied storage just means the choice lasts for this page view only.
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

interface LandingMotionContextValue {
    paused: boolean;
    toggle: () => void;
}

const LandingMotionContext = createContext<LandingMotionContextValue | null>(null);

// The hero typewriter and the mobile feature marquee sit in distant branches of
// the page, so the one pause preference that governs both lives here.
export function LandingMotionProvider({ children }: { children: ReactNode }) {
    // The server cannot see the stored choice, so it renders as playing and the
    // first client read corrects it.
    const paused = useSyncExternalStore(subscribe, readPaused, () => false);
    const toggle = useCallback(() => writePaused(!readPaused()), []);
    const value = useMemo(() => ({ paused, toggle }), [paused, toggle]);

    return <LandingMotionContext.Provider value={value}>{children}</LandingMotionContext.Provider>;
}

export function useLandingMotion(): LandingMotionContextValue {
    const value = useContext(LandingMotionContext);
    if (!value) throw new Error('useLandingMotion must be used inside LandingMotionProvider');
    return value;
}
