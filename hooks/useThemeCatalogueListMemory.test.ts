import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeCatalogueListMemory } from '@/hooks/useThemeCatalogueListMemory';

function setScrollY(value: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value });
}

beforeEach(() => {
    window.sessionStorage.clear();
    setScrollY(0);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
    });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('useThemeCatalogueListMemory', () => {
    it('saves how far the visitor scrolled and how many cards they revealed', () => {
        const { rerender, unmount } = renderHook(({ count }) => useThemeCatalogueListMemory('catalogue', true, count, vi.fn()), {
            initialProps: { count: 24 },
        });
        setScrollY(1200);
        window.dispatchEvent(new Event('scroll'));
        expect(JSON.parse(window.sessionStorage.getItem('catalogue')!)).toEqual({ visibleCount: 24, scrollY: 1200 });

        rerender({ count: 48 });
        expect(JSON.parse(window.sessionStorage.getItem('catalogue')!)).toEqual({ visibleCount: 48, scrollY: 1200 });

        // Leaving doesn't save: the next page may have scrolled already.
        unmount();
        setScrollY(0);
        window.dispatchEvent(new Event('scroll'));
        expect(JSON.parse(window.sessionStorage.getItem('catalogue')!)).toEqual({ visibleCount: 48, scrollY: 1200 });
    });

    it('puts both back once the themes are there', () => {
        window.sessionStorage.setItem('catalogue', JSON.stringify({ visibleCount: 48, scrollY: 1200 }));
        const restoreCount = vi.fn();
        const { rerender } = renderHook(({ ready }) => useThemeCatalogueListMemory('catalogue', ready, 24, restoreCount), {
            initialProps: { ready: false },
        });
        expect(restoreCount).not.toHaveBeenCalled();

        rerender({ ready: true });
        expect(restoreCount).toHaveBeenCalledWith(48);
        expect(window.scrollTo).toHaveBeenCalledWith(0, 1200);

        // Once per set of filters, not on every render.
        rerender({ ready: true });
        expect(restoreCount).toHaveBeenCalledTimes(1);
    });

    it('starts at the top for filters with nothing saved', () => {
        window.sessionStorage.setItem('other', JSON.stringify({ visibleCount: 48, scrollY: 1200 }));
        const restoreCount = vi.fn();
        renderHook(() => useThemeCatalogueListMemory('catalogue', true, 24, restoreCount));
        expect(restoreCount).not.toHaveBeenCalled();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('ignores a broken saved value', () => {
        window.sessionStorage.setItem('catalogue', '{not json');
        const restoreCount = vi.fn();
        renderHook(() => useThemeCatalogueListMemory('catalogue', true, 24, restoreCount));
        expect(restoreCount).not.toHaveBeenCalled();
    });
});
