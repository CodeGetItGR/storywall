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

// Mirrors --ink-muted: the feed's grey labels. A feed background colour must keep them at about the contrast they have on the
// app's own backgrounds (cream is 3.3).
export const INK_MUTED_COLOR = '#8A7C70';
export const MIN_INK_MUTED_CONTRAST = 3;

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

// Ink text, or the muted ink labels, can't be read on this colour: the theme sheet warns, and the colour is drawn lightened.
export function tooDarkForInk(hex: string): boolean {
    return tooDarkForInkText(hex) || contrastRatio(hex, INK_MUTED_COLOR) < MIN_INK_MUTED_CONTRAST;
}

// Ink text can't be read on this colour. The rule for a section's own background: it has no grey labels.
export function tooDarkForInkText(hex: string): boolean {
    return contrastRatio(hex, INK_COLOR) < MIN_INK_CONTRAST;
}

function lightenedUntil(hex: string, tooDark: (color: string) => boolean): string {
    if (!tooDark(hex)) return hex;
    for (let step = 1; step <= 20; step += 1) {
        const mixed = mixWithWhite(hex, step / 20);
        if (!tooDark(mixed)) return mixed;
    }
    return '#FFFFFF';
}

// The colour itself when ink and muted ink text read on it; otherwise the colour mixed toward white until they do.
export function readableOnInk(hex: string): string {
    return lightenedUntil(hex, tooDarkForInk);
}

// The same for ink text alone.
export function readableOnInkText(hex: string): string {
    return lightenedUntil(hex, tooDarkForInkText);
}

// A lighter tone of a colour: mixed toward white by `amount` (0–1), then lightened further only if ink or the
// grey labels still can't be read on it. The feed's post cards on a Save my date theme use it.
export function lightTone(hex: string, amount: number): string {
    return readableOnInk(mixWithWhite(hex, amount));
}
