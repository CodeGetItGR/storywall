import { useCallback, useRef, useState } from 'react';

// Tracks whether a sentinel marker has scrolled above the viewport, so a
// companion element (e.g. an action bar) can switch from its normal in-flow
// position to a floating one once the user has scrolled past it.
//
// Uses a callback ref instead of useEffect + a plain ref: the sentinel is
// often only mounted conditionally (e.g. while a selection mode is active),
// so the observer must (re)attach whenever the element itself mounts rather
// than once when the owning component first renders.
export function useScrolledPastSentinel() {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [scrolledPast, setScrolledPast] = useState(false);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;

        if (!node) {
            setScrolledPast(false);
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            setScrolledPast(entry.boundingClientRect.top < 0);
        });
        observer.observe(node);
        observerRef.current = observer;
    }, []);

    return { sentinelRef, scrolledPast };
}
