import { useRef } from 'react';

// At 100%, scrolling one image across scrolls the other too.
export function useSyncedScroll() {
    const firstRef = useRef<HTMLDivElement>(null);
    const secondRef = useRef<HTMLDivElement>(null);

    function handleFirstScroll() {
        if (firstRef.current && secondRef.current) secondRef.current.scrollLeft = firstRef.current.scrollLeft;
    }

    function handleSecondScroll() {
        if (firstRef.current && secondRef.current) firstRef.current.scrollLeft = secondRef.current.scrollLeft;
    }

    return { firstRef, secondRef, handleFirstScroll, handleSecondScroll };
}
