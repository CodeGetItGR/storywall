import { encode } from 'uqr';

// The code in module units (one module = 1), without the quiet zone. `d` draws every dark module as a
// plain square, finder patterns included. `logo` is the square the centre logo covers, in modules.
export type QrCodePath = {
    size: number;
    d: string;
    logo: { start: number; span: number } | null;
};

// The logo's side in modules: odd, so it sits exactly on the centre module, and about a fifth of the code.
export function logoSpan(size: number): number {
    const span = Math.floor(size * 0.2);
    return span % 2 === 1 ? span : span - 1;
}

// Error correction H when the logo covers modules (it rebuilds up to 30%), else Q. The logo's square
// and a one-module ring around it are cleared, so no module touches the logo.
export function qrModules(text: string, centerLogo: boolean) {
    const { size, data } = encode(text, { ecc: centerLogo ? 'H' : 'Q', border: 0 });
    const span = centerLogo ? logoSpan(size) : 0;
    const centre = (size - 1) / 2;
    const clearRadius = (span + 1) / 2;
    const isCleared = (row: number, col: number) => centerLogo && Math.abs(row - centre) <= clearRadius && Math.abs(col - centre) <= clearRadius;
    return {
        size,
        isDark: (row: number, col: number) => data[row][col] && !isCleared(row, col),
        logo: centerLogo ? { start: centre - (span - 1) / 2, span } : null,
    };
}

// One path of runs of dark modules along each row: neighbours inside a run share no anti-aliased seam.
export function qrCodePath(text: string, { centerLogo }: { centerLogo: boolean }): QrCodePath {
    const { size, isDark, logo } = qrModules(text, centerLogo);
    const parts: string[] = [];
    for (let row = 0; row < size; row++) {
        let start = -1;
        for (let col = 0; col <= size; col++) {
            const dark = col < size && isDark(row, col);
            if (dark && start < 0) start = col;
            if (!dark && start >= 0) {
                parts.push(`M${start} ${row}h${col - start}v1h${start - col}z`);
                start = -1;
            }
        }
    }
    return { size, d: parts.join(''), logo };
}
