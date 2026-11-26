'use client';

import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { nearestSlide } from '@/lib/feedModuleContent';

function slidesOf(scroller: HTMLElement): HTMLElement[] {
    return Array.from(scroller.children) as HTMLElement[];
}

// A row of cards that swipes sideways and snaps: which card is in the middle, and the dots that move to one.
// Each dot carries its card's index as data-index.
export function useSnapCarousel() {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    const onScroll = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const centres = slidesOf(scroller).map((slide) => slide.offsetLeft + slide.offsetWidth / 2);
        setActive(nearestSlide(centres, scroller.scrollLeft + scroller.clientWidth / 2));
    }, []);

    const onDot = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const scroller = scrollerRef.current;
        const index = Number(event.currentTarget.dataset.index);
        const slide = scroller ? slidesOf(scroller)[index] : undefined;
        if (!scroller || !slide) return;
        scroller.scrollTo({ left: slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2, behavior: 'smooth' });
        setActive(index);
    }, []);

    return { scrollerRef, active, onScroll, onDot };
}
