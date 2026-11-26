'use client';

import { useCallback, useState } from 'react';

import { isSameColor } from '@/lib/colorCircles';

type ColorMixerOptions = { live: boolean; onPicked?: () => void };

// The colour mixer behind "+": the colour shows live while it's mixed (or only in the mixer, without live); Done keeps
// the one on show.
export function useColorMixer(value: string | undefined, start: string, onChange: (color: string) => void, { live, onPicked }: ColorMixerOptions) {
    const [isOpen, setIsOpen] = useState(false);
    const [color, setColor] = useState(start);

    const onOpenChange = useCallback(
        (open: boolean) => {
            if (open) setColor(value ?? start);
            setIsOpen(open);
        },
        [start, value],
    );

    const mix = useCallback(
        (next: string) => {
            const upper = next.toUpperCase();
            setColor(upper);
            if (live) onChange(upper);
        },
        [live, onChange],
    );

    const done = useCallback(() => {
        if (!isSameColor(color, value)) onChange(color);
        setIsOpen(false);
        onPicked?.();
    }, [color, onChange, onPicked, value]);

    return { isOpen, onOpenChange, color, mix, done };
}
