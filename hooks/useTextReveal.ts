import { useReducedMotion } from 'framer-motion';
import { animate } from 'framer-motion/dom/mini';
import { type RefObject, useLayoutEffect } from 'react';

import {
    revealEndStyle,
    revealProperties,
    TEXT_OBSERVER_OPTIONS,
    type TextAnimation,
    textBlockIsOnScreen,
    textReveal,
    textRevealOptions,
} from '@/lib/invitation/textReveal';

const PENDING = 'wedart-text-anim-pending';
const WAITING = 'wedart-text-anim-waiting';
// The CSS animation in effects.css that shows waiting text if the script is late.
const SHOW_ANYWAY = 'smdTextShowAnyway';

// The theme's text animation. Each text block plays it once, when that block
// reaches the screen, rather than when its section does. Text already on screen
// starts straight away. Works on the page's text blocks directly, like the old
// engine, so the sections don't have to know about it.
export function useTextReveal(rootRef: RefObject<HTMLElement | null>, animation: TextAnimation) {
    const reduceMotion = useReducedMotion();

    useLayoutEffect(() => {
        const root = rootRef.current;
        const reveal = textReveal(animation);
        if (!root) return;
        if (!reveal || reduceMotion) {
            root.classList.remove(WAITING);
            return;
        }

        const blocks = Array.from(root.querySelectorAll<HTMLElement>('.section .text-block'));
        const running = new Set<{ cancel: () => void }>();
        const endStyle = revealEndStyle(reveal);
        const holdEnd = (block: HTMLElement) => {
            for (const [property, value] of Object.entries(endStyle)) block.style.setProperty(property, value);
        };
        const clearStyles = (block: HTMLElement) => {
            for (const property of revealProperties(reveal)) block.style.setProperty(property, '');
        };
        // Text the CSS fallback already showed, because the page took over 4s to
        // start. Hiding it now would make it flash and play again.
        const shownAnyway = (block: HTMLElement) =>
            root.classList.contains(WAITING) &&
            Boolean(block.getAnimations?.().some((playback) => (playback as CSSAnimation).animationName === SHOW_ANYWAY && playback.playState === 'finished'));

        const revealBlock = (block: HTMLElement) => {
            if (!block.classList.contains(PENDING)) return;
            block.classList.remove(PENDING);
            observer.unobserve(block);
            const playback = animate(block, reveal.keyframes, textRevealOptions(reveal));
            running.add(playback);
            playback.then(() => {
                running.delete(playback);
                holdEnd(block);
            });
        };
        const revealOnScreen = () => {
            for (const block of blocks) {
                if (block.classList.contains(PENDING) && textBlockIsOnScreen(block.getBoundingClientRect(), window.innerWidth, window.innerHeight)) {
                    revealBlock(block);
                }
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting || entry.intersectionRatio > 0) revealBlock(entry.target as HTMLElement);
            });
        }, TEXT_OBSERVER_OPTIONS);

        for (const block of blocks) {
            if (shownAnyway(block)) {
                holdEnd(block);
                continue;
            }
            block.classList.add(PENDING);
            observer.observe(block);
        }
        root.classList.remove(WAITING);
        revealOnScreen();

        // The scroll check covers scrolling inside other boxes, as the old engine's did.
        let frame = 0;
        const onViewportChange = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                revealOnScreen();
            });
        };
        window.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
        window.addEventListener('resize', onViewportChange, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onViewportChange, { capture: true });
            window.removeEventListener('resize', onViewportChange);
            if (frame) cancelAnimationFrame(frame);
            running.forEach((playback) => playback.cancel());
            for (const block of blocks) {
                block.classList.remove(PENDING);
                clearStyles(block);
            }
        };
    }, [rootRef, animation, reduceMotion]);
}
