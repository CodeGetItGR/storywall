import { colorInputValue } from '@/lib/invitation/colorInput';

// The app's own colours in every colour picker: coral, sage, lilac, sand.
export const SOLID_COLORS = ['#FF7A59', '#B5BFA6', '#AC9FC7', '#CFB98C'] as const;

// The feed theme sheet's own extra circle; no other picker offers it.
export const WHITE = '#FFFFFF';

// #RRGGBB, or nothing for a colour with none (transparent).
function plainColor(color: string): string {
    return colorInputValue(color, '').toUpperCase();
}

export function isSameColor(first: string | undefined, second: string | undefined): boolean {
    if (!first || !second) return false;
    const plain = plainColor(first);
    return plain !== '' && plain === plainColor(second);
}

// One of the app's four.
export function isOwnColor(color: string): boolean {
    return SOLID_COLORS.some((own) => isSameColor(own, color));
}

// The circles to show: the theme's colours, the app's four, then the colour in use when it's none of them. Each once.
export function colorCircles(themeColors: readonly string[], value: string | undefined): string[] {
    const colors = [...themeColors, ...SOLID_COLORS, ...(value ? [value] : [])].map(plainColor).filter(Boolean);
    return [...new Set(colors)];
}
