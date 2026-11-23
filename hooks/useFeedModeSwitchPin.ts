'use client';

import { useEffect, useRef, useState } from 'react';

// Whether the pill (the ref'd element, in the page's flow) has scrolled under the feed's sticky header. The page
// then draws a copy pinned below the header and keeps the original's space, so nothing jumps.
export function useFeedModeSwitchPin(active: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        if (!active) return;
        let frame = 0;
        const check = () => {
            frame = 0;
            const node = ref.current;
            if (!node) return;
            const header = document.querySelector('[data-feed-header]');
            const bottom = header ? header.getBoundingClientRect().bottom : 0;
            setPinned(node.getBoundingClientRect().top < bottom);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(check);
        };
        schedule();
        // The page scrolls inside the app shell, not the window; scroll events don't bubble, so listen while they're captured.
        document.addEventListener('scroll', schedule, { capture: true, passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            document.removeEventListener('scroll', schedule, { capture: true });
            window.removeEventListener('resize', schedule);
        };
    }, [active]);

    return { ref, pinned: active && pinned };
}
