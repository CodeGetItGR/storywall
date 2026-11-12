import { useRef } from 'react';

// At 100%, scrolling one image across scrolls the other too.
export function useSyncedScroll() {
    const firstRef = useRef<HTMLDivElement>(null);
    const secondRef = useRef<HTMLDivElement>(null);
    // The side moved to match fires its own scroll event, which mustn't move the first side back.
    const movedRef = useRef<HTMLDivElement | null>(null);

    function follow(from: HTMLDivElement | null, to: HTMLDivElement | null) {
        if (!from || !to) return;
        if (movedRef.current === from) {
            movedRef.current = null;
            return;
        }
        const was = to.scrollLeft;
        to.scrollLeft = from.scrollLeft;
        // Only a side that actually moved fires a scroll event.
        if (to.scrollLeft !== was) movedRef.current = to;
    }

    function handleFirstScroll() {
        follow(firstRef.current, secondRef.current);
    }

    function handleSecondScroll() {
        follow(secondRef.current, firstRef.current);
    }

    return { firstRef, secondRef, handleFirstScroll, handleSecondScroll };
}
