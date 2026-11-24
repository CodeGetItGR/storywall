'use client';

import { useCallback, useState } from 'react';

import { isSameColor } from '@/lib/colorCircles';

// The colour mixer behind "+": the colour shows live while it's mixed; Done keeps the one on show.
export function useColorMixer(value: string | undefined, start: string, onChange: (color: string) => void) {
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
            onChange(upper);
        },
        [onChange],
    );

    const done = useCallback(() => {
        if (!isSameColor(color, value)) onChange(color);
        setIsOpen(false);
    }, [color, onChange, value]);

    return { isOpen, onOpenChange, color, mix, done };
}
