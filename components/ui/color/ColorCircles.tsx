'use client';

import { useMemo } from 'react';

import { ColorCircle } from '@/components/ui/color/ColorCircle';
import { ColorMixer } from '@/components/ui/color/ColorMixer';
import { colorCircles, isSameColor } from '@/lib/colorCircles';

type ColorCirclesProps = {
    value: string | undefined;
    onChange: (color: string) => void;
    // The theme's own colours, shown first.
    themeColors?: readonly string[];
    // Names the group: an element's id, or its own words.
    labelledBy?: string;
    label?: string;
    surface?: 'dark' | 'light';
    disabled?: boolean;
};

const NO_COLORS: readonly string[] = [];

// The app's colour picker: circles, then "+" with the mixer for any other colour.
export function ColorCircles({ value, onChange, themeColors = NO_COLORS, labelledBy, label, surface = 'dark', disabled }: ColorCirclesProps) {
    const colors = useMemo(() => colorCircles(themeColors, value), [themeColors, value]);

    return (
        <div role="group" aria-labelledby={labelledBy} aria-label={label} className="flex flex-wrap gap-3 p-1">
            {/* Circles */}
            {colors.map((color) => (
                <ColorCircle key={color} color={color} selected={isSameColor(color, value)} disabled={disabled} onPick={onChange} />
            ))}

            {/* Mixer */}
            <ColorMixer value={value} start={colors[0]} surface={surface} disabled={disabled} onChange={onChange} />
        </div>
    );
}
