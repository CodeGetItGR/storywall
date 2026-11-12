'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useState } from 'react';

/** Swiping, arrow keys and tap-outside for the full-screen gallery photos. */
export function useLightboxSlides(startIndex: number, count: number, close: () => void) {
    const [viewportRef, embla] = useEmblaCarousel({ startIndex, loop: true, watchDrag: count > 1 });
    const [index, setIndex] = useState(startIndex);

    useEffect(() => {
        if (!embla) return;
        function syncIndex() {
            if (embla) setIndex(embla.selectedScrollSnap());
        }
        embla.on('select', syncIndex);
        return () => {
            embla.off('select', syncIndex);
        };
    }, [embla]);

    const previous = useCallback(() => embla?.scrollPrev(), [embla]);
    const next = useCallback(() => embla?.scrollNext(), [embla]);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') previous();
            if (event.key === 'ArrowRight') next();
        },
        [next, previous],
    );

    // The slide fills the screen around its photo, so a tap on it is a tap outside the photo.
    const onSlideClick = useCallback(
        (event: MouseEvent) => {
            if (event.target === event.currentTarget) close();
        },
        [close],
    );

    return { viewportRef, index, previous, next, onKeyDown, onSlideClick };
}
