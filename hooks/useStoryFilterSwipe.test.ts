import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStoryFilterSwipe } from '@/hooks/useStoryFilterSwipe';

function fakePointerEvent(clientX: number) {
    return { clientX, pointerId: 1, currentTarget: { setPointerCapture: vi.fn() } } as unknown as Parameters<
        ReturnType<typeof useStoryFilterSwipe>['handlers']['onPointerDown']
    >[0];
}

describe('useStoryFilterSwipe', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts at index 0 with no visible name', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.visibleName).toBeNull();
    });

    it('advances to the next preset on a leftward drag past the threshold', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => {
            result.current.handlers.onPointerDown(fakePointerEvent(200));
            result.current.handlers.onPointerUp(fakePointerEvent(100));
        });

        expect(result.current.currentIndex).toBe(1);
        expect(result.current.visibleName).toBe('warm');
    });

    it('goes back to the previous preset on a rightward drag past the threshold', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => result.current.setIndex(2));
        act(() => {
            result.current.handlers.onPointerDown(fakePointerEvent(100));
            result.current.handlers.onPointerUp(fakePointerEvent(200));
        });

        expect(result.current.currentIndex).toBe(1);
    });

    it('ignores drags that do not cross the swipe threshold', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => {
            result.current.handlers.onPointerDown(fakePointerEvent(200));
            result.current.handlers.onPointerUp(fakePointerEvent(190));
        });

        expect(result.current.currentIndex).toBe(0);
        expect(result.current.visibleName).toBeNull();
    });

    it('clamps at the last preset — no wraparound', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => result.current.setIndex(2));
        act(() => {
            result.current.handlers.onPointerDown(fakePointerEvent(200));
            result.current.handlers.onPointerUp(fakePointerEvent(100));
        });

        expect(result.current.currentIndex).toBe(2);
    });

    it('clamps at the first preset — no wraparound', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => {
            result.current.handlers.onPointerDown(fakePointerEvent(100));
            result.current.handlers.onPointerUp(fakePointerEvent(200));
        });

        expect(result.current.currentIndex).toBe(0);
    });

    it('clears visibleName about 1s after the last change', () => {
        const { result } = renderHook(() => useStoryFilterSwipe(['original', 'warm', 'noir']));

        act(() => result.current.setIndex(1));
        expect(result.current.visibleName).toBe('warm');

        act(() => vi.advanceTimersByTime(1000));
        expect(result.current.visibleName).toBeNull();
    });
});
