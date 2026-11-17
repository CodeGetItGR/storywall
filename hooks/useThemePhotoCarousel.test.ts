import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useThemePhotoCarousel } from '@/hooks/useThemePhotoCarousel';

function touch(x: number, y: number, list: 'touches' | 'changedTouches') {
    return { [list]: [{ clientX: x, clientY: y }] } as unknown as TouchEvent;
}

function swipe(result: { current: ReturnType<typeof useThemePhotoCarousel> }, from: [number, number], to: [number, number]) {
    act(() => result.current.onTouchStart(touch(...from, 'touches')));
    act(() => result.current.onTouchEnd(touch(...to, 'changedTouches')));
}

describe('useThemePhotoCarousel', () => {
    it('wraps around at both ends', () => {
        const { result } = renderHook(() => useThemePhotoCarousel(3));
        act(() => result.current.previous());
        expect(result.current.index).toBe(2);
        act(() => result.current.next());
        expect(result.current.index).toBe(0);
    });

    it('changes photo on a long sideways swipe only', () => {
        const { result } = renderHook(() => useThemePhotoCarousel(3));
        swipe(result, [200, 100], [180, 100]);
        expect(result.current.index).toBe(0);

        // Mostly upright: the page scrolls instead.
        swipe(result, [200, 100], [150, 220]);
        expect(result.current.index).toBe(0);

        swipe(result, [200, 100], [120, 110]);
        expect(result.current.index).toBe(1);
        swipe(result, [100, 100], [200, 100]);
        expect(result.current.index).toBe(0);
    });

    it('stays on the only photo, and on a valid one when the photos change', () => {
        const { result, rerender } = renderHook(({ count }) => useThemePhotoCarousel(count), { initialProps: { count: 1 } });
        swipe(result, [200, 100], [100, 100]);
        expect(result.current.index).toBe(0);

        rerender({ count: 3 });
        act(() => result.current.select(2));
        rerender({ count: 2 });
        expect(result.current.index).toBe(1);
    });
});
