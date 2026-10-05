import type { CSSProperties } from 'react';

// The only colour shape the backend stores for a theme (normalised upper-case there).
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
    return HEX_COLOR_PATTERN.test(value);
}

// The theme colour as the --event-bg custom property that `bg-event` surfaces read.
// Undefined keeps the default look: no theme, or a value that isn't #RRGGBB.
export function eventThemeStyle(backgroundColor: string | null | undefined): CSSProperties | undefined {
    if (!backgroundColor || !isHexColor(backgroundColor)) return undefined;
    return { '--event-bg': backgroundColor } as CSSProperties;
}
