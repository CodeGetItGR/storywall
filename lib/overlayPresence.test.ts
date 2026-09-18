import { describe, expect, it, vi } from 'vitest';

import { getHasOpenOverlay, registerOverlayPresence, subscribeOverlayPresence } from '@/lib/overlayPresence';

describe('overlayPresence', () => {
    it('reports no open overlay by default', () => {
        expect(getHasOpenOverlay()).toBe(false);
    });

    it('reports open while at least one overlay is registered', () => {
        const first = registerOverlayPresence('a');
        const second = registerOverlayPresence('b');
        expect(getHasOpenOverlay()).toBe(true);

        first();
        expect(getHasOpenOverlay()).toBe(true);

        second();
        expect(getHasOpenOverlay()).toBe(false);
    });

    it('ignores a double unregister', () => {
        const remove = registerOverlayPresence('a');
        remove();
        remove();
        expect(getHasOpenOverlay()).toBe(false);
    });

    it('notifies subscribers only when the open state flips', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeOverlayPresence(listener);

        const removeA = registerOverlayPresence('a');
        expect(listener).toHaveBeenCalledTimes(1);

        const removeB = registerOverlayPresence('b');
        expect(listener).toHaveBeenCalledTimes(1);

        removeA();
        expect(listener).toHaveBeenCalledTimes(1);

        removeB();
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        registerOverlayPresence('c')();
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
