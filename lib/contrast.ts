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
    return luminanceContrast(relativeLuminance(first), relativeLuminance(second));
}

// The same between two relative luminances.
export function luminanceContrast(a: number, b: number): number {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Mirrors the --ink token in app/globals.css: the app's ink text colour, and the contrast a background needs against it (the wall presets' rule;
// the backend checks the same).
export const INK_COLOR = '#241F1A';
export const MIN_INK_CONTRAST = 4.5;

// Mirrors --ink-muted: the feed's grey labels. A feed background colour must keep them at about the contrast they have on the
// app's own backgrounds (cream is 3.3).
export const INK_MUTED_COLOR = '#8A7C70';
export const MIN_INK_MUTED_CONTRAST = 3;

// `hex` mixed toward `other` by `amount` (0–1).
export function mixColors(hex: string, other: string, amount: number): string {
    return `#${[1, 3, 5]
        .map((start) => {
            const [from, to] = [hex, other].map((color) => parseInt(color.slice(start, start + 2), 16));
            return Math.round(from + (to - from) * amount)
                .toString(16)
                .padStart(2, '0');
        })
        .join('')
        .toUpperCase()}`;
}

const mixWithWhite = (hex: string, amount: number) => mixColors(hex, '#FFFFFF', amount);

// Ink text, or the muted ink labels, can't be read on this colour: the page's own text changes colour (lib/pageTone.ts).
export function tooDarkForInk(hex: string): boolean {
    return contrastRatio(hex, INK_COLOR) < MIN_INK_CONTRAST || contrastRatio(hex, INK_MUTED_COLOR) < MIN_INK_MUTED_CONTRAST;
}

// The colour itself when ink and muted ink text read on it; otherwise the colour mixed toward white until they do.
function readableOnInk(hex: string): string {
    if (!tooDarkForInk(hex)) return hex;
    for (let step = 1; step <= 20; step += 1) {
        const mixed = mixWithWhite(hex, step / 20);
        if (!tooDarkForInk(mixed)) return mixed;
    }
    return '#FFFFFF';
}

// A lighter tone of a colour: mixed toward white by `amount` (0–1), then lightened further only if ink or the
// grey labels still can't be read on it. The feed's post cards on a Save my date theme use it.
export function lightTone(hex: string, amount: number): string {
    return readableOnInk(mixWithWhite(hex, amount));
}
