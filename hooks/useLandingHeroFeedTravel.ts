import { useEffect, useRef } from 'react';

// The hero phone scrolls its feed all the way to the bottom, pausing 32% and
// 67% of the way down. That distance depends on the rendered phone size, so
// the keyframes read their stops from variables measured here.
export function useLandingHeroFeedTravel() {
    const screenRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const screen = screenRef.current;
        const track = trackRef.current;
        if (!screen || !track) return;

        const syncFeedTravel = () => {
            const distance = Math.max(0, Math.ceil(track.scrollHeight - screen.clientHeight));
            track.style.setProperty('--sw-feed-stop-1', `${-distance * 0.32}px`);
            track.style.setProperty('--sw-feed-stop-2', `${-distance * 0.67}px`);
            track.style.setProperty('--sw-feed-end', `${-distance}px`);
        };

        // The screen resizes with the viewport; the feed grows if a screenshot
        // settles at a different height than its reserved box.
        const resizeObserver = new ResizeObserver(syncFeedTravel);
        resizeObserver.observe(screen);
        resizeObserver.observe(track);
        syncFeedTravel();

        return () => resizeObserver.disconnect();
    }, []);

    return { screenRef, trackRef };
}
