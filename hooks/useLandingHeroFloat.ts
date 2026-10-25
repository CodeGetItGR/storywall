import { animate, type AnimationPlaybackControls, type MotionValue, motionValue, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type FloatProperty = 'x' | 'y' | 'rotate' | 'scale';

export type LandingHeroFloat = {
    keyframes: Partial<Record<FloatProperty, number[]>>;
    // Seconds per loop. A negative delay starts the loop partway through.
    duration: number;
    delay?: number;
};

export type LandingHeroFloatStyle = Partial<Record<FloatProperty, MotionValue<number>>>;

type FloatTrack = { value: MotionValue<number>; keyframes: number[]; duration: number; delay?: number };

const AT_REST: Record<FloatProperty, number> = { x: 0, y: 0, rotate: 0, scale: 1 };

// One motion value per animated property, grouped by float for the `style` props, and listed flat
// for the loops that drive them.
function floatTracks(floats: Record<string, LandingHeroFloat>) {
    const styles: Record<string, LandingHeroFloatStyle> = {};
    const tracks: FloatTrack[] = [];
    for (const [key, { keyframes, duration, delay }] of Object.entries(floats)) {
        const style: LandingHeroFloatStyle = {};
        for (const [property, frames] of Object.entries(keyframes) as [FloatProperty, number[]][]) {
            const value = motionValue(AT_REST[property]);
            style[property] = value;
            tracks.push({ value, keyframes: frames, duration, delay });
        }
        styles[key] = style;
    }
    return { styles, tracks };
}

// The hero's floating cards and phone loop on motion values rather than the `animate` prop, so the
// landing's pause can hold each one where it is and carry on from there, with no jump. `floats`
// must be a module-level constant: its motion values are made once.
export function useLandingHeroFloat(floats: Record<string, LandingHeroFloat>, paused: boolean) {
    const reduceMotion = useReducedMotion();
    const [{ styles, tracks }] = useState(() => floatTracks(floats));
    const loops = useRef<AnimationPlaybackControls[]>([]);

    useEffect(() => {
        if (reduceMotion) return;
        const started = tracks.map(({ value, keyframes, duration, delay }) =>
            animate(value, keyframes, { duration, delay, ease: 'easeInOut', repeat: Infinity }),
        );
        loops.current = started;

        return () => {
            started.forEach((loop) => loop.stop());
            loops.current = [];
        };
    }, [reduceMotion, tracks]);

    // Also runs after the loops restart, so a fresh loop starts held while paused.
    useEffect(() => {
        loops.current.forEach((loop) => (paused ? loop.pause() : loop.play()));
    }, [paused, reduceMotion]);

    return styles;
}
