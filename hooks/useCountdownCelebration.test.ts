import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdownCelebration } from '@/hooks/useCountdownCelebration';

const EVENT_ID = 'event-123';
const STORAGE_KEY = 'countdown-celebrated:event-123';

function renderCelebration(props: { hasFinished: boolean; targetTime: number }) {
    return renderHook((p: { hasFinished: boolean; targetTime: number }) => useCountdownCelebration({ eventId: EVENT_ID, ...p }), {
        initialProps: props,
    });
}

function setPrefersReducedMotion(matches: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

describe('useCountdownCelebration', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setPrefersReducedMotion(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not celebrate while the countdown has not finished', () => {
        const { result } = renderCelebration({ hasFinished: false, targetTime: Date.now() + 60_000 });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('celebrates on live rollover (target time just now)', () => {
        const targetTime = Date.now();
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(true);
    });

    it('celebrates when loading within the 30-minute grace window', () => {
        const targetTime = Date.now() - 10 * 60 * 1000;
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(true);
    });

    it('does not celebrate when loading more than 30 minutes after start', () => {
        const targetTime = Date.now() - 45 * 60 * 1000;
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('does not celebrate again once already marked as celebrated', () => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('marks the event as celebrated in localStorage once triggered', () => {
        renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('does not set shouldCelebrate when the user prefers reduced motion, but still marks as seen', () => {
        setPrefersReducedMotion(true);
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(false);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('celebrates when hasFinished transitions from false to true mid-session (live rollover while mounted)', () => {
        const targetTime = Date.now() + 3000;
        const { result, rerender } = renderCelebration({ hasFinished: false, targetTime });
        expect(result.current.shouldCelebrate).toBe(false);

        rerender({ hasFinished: true, targetTime });

        expect(result.current.shouldCelebrate).toBe(true);
    });

    it('resets shouldCelebrate when onCelebrationComplete is called', () => {
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(true);

        act(() => result.current.onCelebrationComplete());

        expect(result.current.shouldCelebrate).toBe(false);
    });
});
