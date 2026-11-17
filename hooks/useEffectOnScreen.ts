import { type RefObject, useEffect, useState } from 'react';

import { EFFECT_OBSERVER_OPTIONS, effectIsOnScreen } from '@/lib/invitation/backgroundEffects';

// Whether a section's effect layer is on screen. The observer does the work; the
// scroll check covers scrolling inside other boxes, as the old engine's did.
export function useEffectOnScreen(ref: RefObject<HTMLElement | null>, enabled: boolean): boolean {
    const [onScreen, setOnScreen] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element || !enabled) return;

        const measure = () => effectIsOnScreen(element.getBoundingClientRect(), window.innerWidth, window.innerHeight);
        let frame = 0;
        const onViewportChange = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setOnScreen(measure());
            });
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => setOnScreen(entry.isIntersecting || entry.intersectionRatio > 0 || measure()));
        }, EFFECT_OBSERVER_OPTIONS);

        observer.observe(element);
        document.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
        window.addEventListener('resize', onViewportChange, { passive: true });
        return () => {
            observer.disconnect();
            document.removeEventListener('scroll', onViewportChange, { capture: true });
            window.removeEventListener('resize', onViewportChange);
            if (frame) cancelAnimationFrame(frame);
            setOnScreen(false);
        };
    }, [ref, enabled]);

    return onScreen;
}
