import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEEN_MARGIN_PX, useMoreBelowHint } from '@/hooks/useMoreBelowHint';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let notify: Callback = () => {};
let observerOptions: IntersectionObserverInit | undefined;

class FakeObserver {
    constructor(callback: Callback, options?: IntersectionObserverInit) {
        notify = callback;
        observerOptions = options;
    }
    observe() {}
    disconnect() {}
}

const below = { isIntersecting: false, boundingClientRect: { top: 900 } as DOMRect, rootBounds: { bottom: 800 } as DOMRect };
const inView = { isIntersecting: true, boundingClientRect: { top: 500 } as DOMRect, rootBounds: { bottom: 800 } as DOMRect };

// KAN-213: the "More options" fade shows while the choices are under the first screen, then goes for good.
describe('useMoreBelowHint', () => {
    beforeEach(() => vi.stubGlobal('IntersectionObserver', FakeObserver));
    afterEach(() => vi.unstubAllGlobals());

    const target = { current: document.createElement('div') };

    it('shows while the target is below the screen', () => {
        const { result } = renderHook(() => useMoreBelowHint(target, true));
        act(() => notify([below]));

        expect(result.current.isVisible).toBe(true);
    });

    it('stays hidden once the target has been seen', () => {
        const { result } = renderHook(() => useMoreBelowHint(target, true));
        act(() => notify([below]));
        act(() => notify([inView]));
        act(() => notify([below]));

        expect(result.current.isVisible).toBe(false);
    });

    it('never shows when turned off', () => {
        const { result } = renderHook(() => useMoreBelowHint(target, false));
        act(() => notify([below]));

        expect(result.current.isVisible).toBe(false);
    });

    // On a tall phone the section's heading can just peek in at the bottom edge, behind the hint itself.
    it('only counts the target as seen once it clears the bottom band', () => {
        const { result } = renderHook(() => useMoreBelowHint(target, true));

        expect(observerOptions?.rootMargin).toBe(`0px 0px -${SEEN_MARGIN_PX}px 0px`);
        act(() =>
            notify([{ isIntersecting: false, boundingClientRect: { top: 790 } as DOMRect, rootBounds: { bottom: 800 - SEEN_MARGIN_PX } as DOMRect }]),
        );
        expect(result.current.isVisible).toBe(true);
    });
});
