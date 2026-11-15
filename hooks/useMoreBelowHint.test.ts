import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMoreBelowHint } from '@/hooks/useMoreBelowHint';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let notify: Callback = () => {};

class FakeObserver {
    constructor(callback: Callback) {
        notify = callback;
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
});
