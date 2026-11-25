'use client';

import { useCallback, useMemo } from 'react';

import { ColorCircle } from '@/components/ui/color/ColorCircle';
import { ColorMixer } from '@/components/ui/color/ColorMixer';
import { type ColorSurface, useColorSurface } from '@/components/ui/color/ColorSurface';
import { colorCircles, isSameColor } from '@/lib/colorCircles';
import { cn } from '@/lib/utils';

type ColorCirclesProps = {
    value: string | undefined;
    onChange: (color: string) => void;
    // The theme's own colours, shown first.
    themeColors?: readonly string[];
    // Names the group: an element's id, or its own words.
    labelledBy?: string;
    label?: string;
    // Set where the surface around doesn't say (ColorSurfaceProvider).
    surface?: ColorSurface;
    disabled?: boolean;
    className?: string;
    // Mixing changes the colour as it goes; without it, only Done does.
    liveMix?: boolean;
    // A circle was tapped, or the mixer's Done.
    onPicked?: () => void;
};

const NO_COLORS: readonly string[] = [];

// The app's colour picker: circles, then "+" with the mixer for any other colour.
export function ColorCircles({
    value,
    onChange,
    themeColors = NO_COLORS,
    labelledBy,
    label,
    surface: ownSurface,
    disabled,
    className,
    liveMix = true,
    onPicked,
}: ColorCirclesProps) {
    const surface = useColorSurface(ownSurface);
    const colors = useMemo(() => colorCircles(themeColors, value), [themeColors, value]);

    const pick = useCallback(
        (color: string) => {
            onChange(color);
            onPicked?.();
        },
        [onChange, onPicked],
    );

    return (
        <div role="group" aria-labelledby={labelledBy} aria-label={label} className={cn('flex flex-wrap gap-3 p-1', className)}>
            {/* Circles */}
            {colors.map((color) => (
                <ColorCircle key={color} color={color} selected={isSameColor(color, value)} disabled={disabled} onPick={pick} />
            ))}

            {/* Mixer */}
            <ColorMixer value={value} start={colors[0]} surface={surface} disabled={disabled} live={liveMix} onChange={onChange} onPicked={onPicked} />
        </div>
    );
}
