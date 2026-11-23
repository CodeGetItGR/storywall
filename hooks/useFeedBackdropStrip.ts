'use client';

import { useLayoutEffect, useRef } from 'react';

// The element the feed's page backdrop is drawn on (EventThemeScope).
export const FEED_PAGE_SCOPE = '[data-event-scope]';

// Keeps a strip that sits on the page (the sticky header) lined up with the page's backdrop: where it sits on
// the page and how wide the page is, as the variables .feed-backdrop-strip reads (components/event/feedBackdrop.css).
// They follow every scroll and resize, once a frame.
export function useFeedBackdropStrip<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useLayoutEffect(() => {
        const strip = ref.current;
        const page = strip?.closest<HTMLElement>(FEED_PAGE_SCOPE);
        if (!strip || !page) return;

        let frame = 0;
        const place = () => {
            frame = 0;
            const onPage = page.getBoundingClientRect();
            const own = strip.getBoundingClientRect();
            strip.style.setProperty('--feed-page-w', `${onPage.width}px`);
            strip.style.setProperty('--feed-strip-x', `${own.left - onPage.left}px`);
            strip.style.setProperty('--feed-strip-y', `${own.top - onPage.top}px`);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(place);
        };

        place();
        // The page scrolls inside the app shell, not the window; scroll events don't bubble, so listen while they're captured.
        document.addEventListener('scroll', schedule, { capture: true, passive: true });
        const resize = new ResizeObserver(schedule);
        resize.observe(page);
        resize.observe(strip);
        return () => {
            document.removeEventListener('scroll', schedule, { capture: true });
            resize.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    return ref;
}
