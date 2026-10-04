'use client';

import { useEffect } from 'react';

/** Stops the page behind an overlay from scrolling while `locked` is true. */
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [locked]);
}
