// lib/scrollContainer.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scrollAppToTop } from '@/lib/scrollContainer';

afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('scrollAppToTop', () => {
    // The app shell scrolls its <main>, not the window, so both go back to the top.
    it('resets the main scroll area and the window', () => {
        const main = document.createElement('main');
        document.body.append(main);
        let scrollTop = 400;
        Object.defineProperty(main, 'scrollTop', { get: () => scrollTop, set: (value: number) => (scrollTop = value), configurable: true });
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        scrollAppToTop();

        expect(scrollTop).toBe(0);
        expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    it('still resets the window when there is no main', () => {
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        scrollAppToTop();
        expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });
});
