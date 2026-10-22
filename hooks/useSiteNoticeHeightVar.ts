'use client';

import { type RefObject, useEffect } from 'react';

const VAR = '--site-notice-h';

// Publishes the bar's height as --site-notice-h on <html>, so the fixed desktop nav rail can sit
// below it. Removed on unmount, which puts the rail back at the top.
export function useSiteNoticeHeightVar(ref: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty(VAR, `${element.offsetHeight}px`));
        observer.observe(element);
        return () => {
            observer.disconnect();
            root.style.removeProperty(VAR);
        };
    }, [ref]);
}
