import { animate } from 'framer-motion/dom/mini';
import { type RefObject, useEffect } from 'react';

import { backgroundReveal, type SectionEffect } from '@/lib/invitation/backgroundEffects';

// The fade and blurReveal effects: the background comes in each time the section
// reaches the screen. Off screen, the stylesheet's hidden state applies again.
export function useBackgroundReveal(ref: RefObject<HTMLElement | null>, effect: SectionEffect, onScreen: boolean) {
    const { type, speed, intensity } = effect;

    useEffect(() => {
        const element = ref.current;
        const reveal = backgroundReveal({ type, speed, intensity });
        if (!element || !reveal || !onScreen) return;

        const { duration, ease } = reveal.options;
        const animation = animate(element, reveal.keyframes, { duration, ease: [...ease] });
        return () => {
            animation.cancel();
            element.style.opacity = '';
            element.style.filter = '';
        };
    }, [ref, type, speed, intensity, onScreen]);
}
