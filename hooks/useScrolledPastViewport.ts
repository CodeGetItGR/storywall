'use client';

import { useEffect, useState } from 'react';

/** Tracks whether the app's scroll container has been scrolled past one viewport height. */
export function useScrolledPastViewport() {
    const [isPastViewport, setIsPastViewport] = useState(false);

    useEffect(() => {
        const scrollContainer = document.querySelector('main');
        if (!(scrollContainer instanceof HTMLElement)) return;

        const updateVisibility = () => {
            setIsPastViewport(scrollContainer.scrollTop > window.innerHeight);
        };

        updateVisibility();
        scrollContainer.addEventListener('scroll', updateVisibility, { passive: true });

        return () => {
            scrollContainer.removeEventListener('scroll', updateVisibility);
        };
    }, []);

    return isPastViewport;
}
