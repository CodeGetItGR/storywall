// WCAG 2.x colour maths, shared by host and admin code. Inputs are #RRGGBB strings.

// Relative luminance (0–1) of a #RRGGBB colour.
export function relativeLuminance(hex: string): number {
    const [red, green, blue] = [1, 3, 5].map((start) => {
        const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

// WCAG 2.x contrast ratio (1–21) between two #RRGGBB colours, the formula the backend uses.
export function contrastRatio(first: string, second: string): number {
    const a = relativeLuminance(first);
    const b = relativeLuminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Mirrors the --ink token in app/globals.css: the app's ink text colour, and the contrast a background needs against it (the wall presets' rule;
// the backend checks the same).
export const INK_COLOR = '#241F1A';
export const MIN_INK_CONTRAST = 4.5;

function mixWithWhite(hex: string, amount: number): string {
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
    return `#${channels
        .map((channel) =>
            Math.round(channel + (255 - channel) * amount)
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')
        .toUpperCase()}`;
}

// Ink text can't be read on this colour: the Background row warns, and the colour is drawn lightened.
export function tooDarkForInk(hex: string): boolean {
    return contrastRatio(hex, INK_COLOR) < MIN_INK_CONTRAST;
}

// The colour itself when ink text reads on it; otherwise the colour mixed toward white until it does.
export function readableOnInk(hex: string): string {
    if (!tooDarkForInk(hex)) return hex;
    for (let step = 1; step <= 20; step += 1) {
        const mixed = mixWithWhite(hex, step / 20);
        if (!tooDarkForInk(mixed)) return mixed;
    }
    return '#FFFFFF';
}
