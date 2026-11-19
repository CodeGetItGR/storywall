'use client';

import { useCallback, useRef } from 'react';

// The Overview's Menu button on a phone: scrolls down to the section menu at the end of the page
// and moves focus to its first entry, without scrolling a second time.
export function useSectionMenuScroll() {
    const menuRef = useRef<HTMLElement>(null);

    const scrollToMenu = useCallback(() => {
        const menu = menuRef.current;
        if (!menu) return;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        menu.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        menu.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    }, []);

    return { menuRef, scrollToMenu };
}
