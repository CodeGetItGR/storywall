import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSyncedScroll } from './useSyncedScroll';

// A scrollable side that stops at its widest point, like a real one.
function side(max: number) {
    let left = 0;
    return {
        get scrollLeft() {
            return left;
        },
        set scrollLeft(value: number) {
            left = Math.min(Math.max(value, 0), max);
        },
    } as HTMLDivElement;
}

function setUp() {
    const { result } = renderHook(() => useSyncedScroll());
    const wide = side(500);
    const narrow = side(300);
    result.current.firstRef.current = wide;
    result.current.secondRef.current = narrow;
    return { scroll: result.current, wide, narrow };
}

describe('useSyncedScroll', () => {
    afterEach(cleanup);

    it('scrolls the other side to match', () => {
        const { scroll, wide, narrow } = setUp();
        wide.scrollLeft = 100;
        scroll.handleFirstScroll();
        expect(narrow.scrollLeft).toBe(100);
    });

    it("doesn't pull the wider side back when the narrower one stops short", () => {
        const { scroll, wide, narrow } = setUp();
        wide.scrollLeft = 400;
        scroll.handleFirstScroll();
        scroll.handleSecondScroll();
        expect(narrow.scrollLeft).toBe(300);
        expect(wide.scrollLeft).toBe(400);
    });

    it('still follows a scroll on the other side afterwards', () => {
        const { scroll, wide, narrow } = setUp();
        wide.scrollLeft = 100;
        scroll.handleFirstScroll();
        scroll.handleSecondScroll();
        narrow.scrollLeft = 50;
        scroll.handleSecondScroll();
        expect(wide.scrollLeft).toBe(50);
    });
});
