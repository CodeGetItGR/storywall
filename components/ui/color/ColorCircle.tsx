'use client';

import { useCallback } from 'react';

// Every circle: its size, and the rings of a picked one in the surface's own colours.
export const CIRCLE_CLASS =
    'h-10 w-10 shrink-0 rounded-full border border-black/10 transition-shadow aria-pressed:shadow-[0_0_0_3px_var(--smd-editor-panel,#fff),0_0_0_5px_var(--smd-editor-strong,var(--ink))] focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';

type ColorCircleProps = { color: string; selected: boolean; disabled?: boolean; onPick: (color: string) => void };

// One colour to pick, named by its code.
export function ColorCircle({ color, selected, disabled, onPick }: ColorCircleProps) {
    const pick = useCallback(() => onPick(color), [color, onPick]);

    return (
        <button
            type="button"
            aria-label={color}
            title={color}
            aria-pressed={selected}
            disabled={disabled}
            onClick={pick}
            className={CIRCLE_CLASS}
            style={{ background: color }}
        />
    );
}
