import { useCallback, useEffect, useState } from 'react';

const GRACE_WINDOW_MS = 30 * 60 * 1000;

function getStorageKey(eventId: string): string {
    return `countdown-celebrated:${eventId}`;
}

function hasAlreadyCelebrated(eventId: string): boolean {
    if (typeof window === 'undefined') return true;

    try {
        return window.localStorage.getItem(getStorageKey(eventId)) === '1';
    } catch {
        return false;
    }
}

function markCelebrated(eventId: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(getStorageKey(eventId), '1');
    } catch {
        // localStorage unavailable (private mode, quota) — nothing to persist.
    }
}

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCountdownCelebration({
    eventId,
    hasFinished,
    targetTime,
}: {
    eventId: string;
    hasFinished: boolean;
    targetTime: number;
}) {
    const [shouldCelebrate, setShouldCelebrate] = useState(false);

    useEffect(() => {
        if (!hasFinished) return;
        if (hasAlreadyCelebrated(eventId)) return;

        const elapsedSinceStart = Date.now() - targetTime;
        if (elapsedSinceStart > GRACE_WINDOW_MS) return;

        markCelebrated(eventId);

        if (prefersReducedMotion()) return;

        setShouldCelebrate(true);
    }, [eventId, hasFinished, targetTime]);

    const onCelebrationComplete = useCallback(() => setShouldCelebrate(false), []);

    return { shouldCelebrate, onCelebrationComplete };
}
