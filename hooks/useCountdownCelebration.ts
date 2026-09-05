import { useCallback, useState } from 'react';

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

function decideShouldCelebrate({ eventId, hasFinished, targetTime }: { eventId: string; hasFinished: boolean; targetTime: number }): boolean {
    if (!hasFinished) return false;
    if (hasAlreadyCelebrated(eventId)) return false;

    const elapsedSinceStart = Date.now() - targetTime;
    if (elapsedSinceStart > GRACE_WINDOW_MS) return false;

    markCelebrated(eventId);

    return !prefersReducedMotion();
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
    const [state, setState] = useState(() => ({
        hasEvaluated: false,
        shouldCelebrate: false,
    }));

    if (hasFinished && !state.hasEvaluated) {
        setState({
            hasEvaluated: true,
            shouldCelebrate: decideShouldCelebrate({ eventId, hasFinished, targetTime }),
        });
    }

    const onCelebrationComplete = useCallback(() => setState((current) => ({ ...current, shouldCelebrate: false })), []);

    return { shouldCelebrate: state.shouldCelebrate, onCelebrationComplete };
}
