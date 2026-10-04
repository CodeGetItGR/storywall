import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from '@/hooks/useCountdown';

describe('useCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts down and stops ticking once the target passes', () => {
        const target = Date.now() + 2_000;
        const { result } = renderHook(() => useCountdown(target));
        expect(result.current).toMatchObject({ seconds: 2, hasFinished: false });

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current).toMatchObject({ seconds: 1, hasFinished: false });

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current.hasFinished).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('never ticks for a target already in the past', () => {
        const { result } = renderHook(() => useCountdown(Date.now() - 60_000));
        expect(result.current.hasFinished).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('starts again when the target moves later', () => {
        const { result, rerender } = renderHook(({ time }: { time: number }) => useCountdown(time), {
            initialProps: { time: Date.now() - 1_000 },
        });
        expect(result.current.hasFinished).toBe(true);

        rerender({ time: Date.now() + 5_000 });
        expect(result.current.hasFinished).toBe(false);
        expect(vi.getTimerCount()).toBe(1);

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current).toMatchObject({ seconds: 4, hasFinished: false });
    });
});
