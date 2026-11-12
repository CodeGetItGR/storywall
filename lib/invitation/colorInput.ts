// A colour picker only takes #rrggbb. The format also allows #rgb, alpha and
// 'transparent', which the picker shows as their nearest plain colour.
export function colorInputValue(color: string | undefined, fallback = '#000000'): string {
    if (!color) return fallback;
    const hex = color.toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
    if (/^#[0-9a-f]{8}$/.test(hex)) return hex.slice(0, 7);
    if (/^#[0-9a-f]{3,4}$/.test(hex)) return `#${[...hex.slice(1, 4)].map((digit) => digit + digit).join('')}`;
    return fallback;
}
