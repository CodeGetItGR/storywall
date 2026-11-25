'use client';

import { useCallback } from 'react';

import type { ColorSurface } from '@/components/ui/color/ColorSurface';
import { isSameColor, WHITE } from '@/lib/colorCircles';
import { cn } from '@/lib/utils';

// Every circle: its size, and the rings of a picked one in the surface's own colours.
export const CIRCLE_CLASS =
    'h-10 w-10 shrink-0 rounded-full border border-black/10 transition-shadow aria-pressed:shadow-[0_0_0_3px_var(--smd-editor-panel,#fff),0_0_0_5px_var(--smd-editor-strong,var(--ink))] focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';

type ColorCircleProps = { color: string; selected: boolean; surface?: ColorSurface; disabled?: boolean; onPick: (color: string) => void };

// One colour to pick, named by its code. White on a light surface gets an edge dark enough to see.
export function ColorCircle({ color, selected, surface, disabled, onPick }: ColorCircleProps) {
    const pick = useCallback(() => onPick(color), [color, onPick]);

    return (
        <button
            type="button"
            aria-label={color}
            title={color}
            aria-pressed={selected}
            disabled={disabled}
            onClick={pick}
            className={cn(CIRCLE_CLASS, surface === 'light' && isSameColor(color, WHITE) && 'border-black/50')}
            style={{ background: color }}
        />
    );
}
