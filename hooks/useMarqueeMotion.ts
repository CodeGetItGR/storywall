'use client';

import { type MotionValue, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';

import { useIsHydrated } from '@/hooks/useIsHydrated';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

type MarqueeMotion = {
    // Reduced motion or the footer's pause: show one copy, still, scrollable by hand.
    still: boolean;
    // The track's translateX, from 0% to -50% (one of its two copies).
    x: MotionValue<string>;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
};

// Slides a track that holds its tiles twice, one copy per `duration` seconds, and stops on hover. The
// server can't see the motion setting, so it applies once the marquee has hydrated.
export function useMarqueeMotion(duration: number): MarqueeMotion {
    const reduceMotion = useReducedMotion();
    const isHydrated = useIsHydrated();
    const { paused } = useLandingMotion();
    const [hovered, setHovered] = useState(false);
    // Share of one copy travelled, 0 to 1. x is set in the same frame (useTransform would lag one frame).
    const progress = useRef(0);
    const x = useMotionValue('0%');
    const still = (isHydrated && Boolean(reduceMotion)) || paused;

    useAnimationFrame((_, delta) => {
        if (still) {
            if (progress.current !== 0) {
                progress.current = 0;
                x.set('0%');
            }
            return;
        }
        if (hovered) return;
        progress.current = (progress.current + delta / (duration * 1000)) % 1;
        x.set(`${progress.current === 0 ? 0 : -50 * progress.current}%`);
    });

    return { still, x, onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false) };
}
