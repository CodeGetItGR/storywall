'use client';

import { useLayoutEffect, useRef } from 'react';

// The element the feed's page backdrop is drawn on (EventThemeScope).
export const FEED_PAGE_SCOPE = '[data-event-scope]';
// A cover picture's layer, fixed to the screen (FeedBackdropLayer), when the page draws one.
const FEED_BACKDROP_LAYER = '[data-feed-backdrop-layer]';
// How far the page scrolls, in pixels, until the strip's line shows in full.
const LINE_SCROLL = 12;

// Keeps a strip that sits on the page (the sticky header) lined up with the page's backdrop: where it sits on
// the page, how wide the page is and how much of the strip's line shows, as the variables .feed-backdrop-strip-fill reads
// (components/event/feedBackdrop.css), and with a cover picture fixed to the screen, where it sits on that picture's layer and how big the layer is.
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
            const y = own.top - onPage.top;
            strip.style.setProperty('--feed-strip-y', `${y}px`);
            strip.style.setProperty('--feed-strip-line', String(Math.min(1, Math.max(0, y / LINE_SCROLL))));
            const layer = page.querySelector(FEED_BACKDROP_LAYER)?.getBoundingClientRect();
            if (!layer) return;
            strip.style.setProperty('--feed-layer-x', `${own.left - layer.left}px`);
            strip.style.setProperty('--feed-layer-y', `${own.top - layer.top}px`);
            strip.style.setProperty('--feed-layer-w', `${layer.width}px`);
            strip.style.setProperty('--feed-layer-h', `${layer.height}px`);
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
        // The layer follows the screen's height, and a theme switch in edit mode adds or drops it.
        window.addEventListener('resize', schedule);
        const changes = new MutationObserver(schedule);
        changes.observe(page, { childList: true, attributes: true, attributeFilter: ['class'] });
        return () => {
            document.removeEventListener('scroll', schedule, { capture: true });
            window.removeEventListener('resize', schedule);
            resize.disconnect();
            changes.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    return ref;
}
