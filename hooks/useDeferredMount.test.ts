import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeferredMount } from '@/hooks/useDeferredMount';

type Props = { likely: boolean; needed: boolean };

function renderDeferredMount(initialProps: Props) {
    return renderHook((props: Props) => useDeferredMount(props), { initialProps });
}

describe('useDeferredMount', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('mounts at once when needed', () => {
        const { result } = renderDeferredMount({ likely: false, needed: true });
        expect(result.current).toBe(true);
    });

    it('stays unmounted while it is neither likely nor needed', () => {
        const { result } = renderDeferredMount({ likely: false, needed: false });

        act(() => vi.advanceTimersByTime(10_000));

        expect(result.current).toBe(false);
    });

    it('mounts shortly after it becomes likely when the browser has no idle callback', () => {
        vi.stubGlobal('requestIdleCallback', undefined);
        const { result, rerender } = renderDeferredMount({ likely: false, needed: false });

        rerender({ likely: true, needed: false });
        expect(result.current).toBe(false);

        act(() => vi.advanceTimersByTime(200));
        expect(result.current).toBe(true);
    });

    it('mounts once the browser is idle', () => {
        let runIdle = () => {};
        vi.stubGlobal(
            'requestIdleCallback',
            vi.fn((callback: () => void) => {
                runIdle = callback;
                return 1;
            }),
        );
        vi.stubGlobal('cancelIdleCallback', vi.fn());
        const { result } = renderDeferredMount({ likely: true, needed: false });

        expect(result.current).toBe(false);

        act(() => runIdle());
        expect(result.current).toBe(true);
    });

    it('cancels the idle wait when it stops being likely', () => {
        const cancelIdleCallback = vi.fn();
        vi.stubGlobal(
            'requestIdleCallback',
            vi.fn(() => 7),
        );
        vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);
        const { rerender } = renderDeferredMount({ likely: true, needed: false });

        rerender({ likely: false, needed: false });

        expect(cancelIdleCallback).toHaveBeenCalledWith(7);
    });

    // Closing must not unmount it, or it couldn't animate out.
    it('stays mounted after it is no longer needed', () => {
        const { result, rerender } = renderDeferredMount({ likely: false, needed: false });

        rerender({ likely: false, needed: true });
        expect(result.current).toBe(true);

        rerender({ likely: false, needed: false });
        expect(result.current).toBe(true);
    });
});
