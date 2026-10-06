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
