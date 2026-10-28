import { encode } from 'uqr';

import type { QrCornerShape, QrDotShape } from '@/lib/api/types';

const FINDER = 7;
const DOT_RADIUS = 0.45;
const ROUNDED_RADIUS = 0.3;

export type QrCodeShapes = { dotShape: QrDotShape; cornerShape: QrCornerShape; centerLogo: boolean };

// The code in module units (one module = 1), without the quiet zone. `dots` holds the data modules;
// `corners` the three finder patterns, drawn with fill-rule evenodd. `logo` is the square the centre
// logo covers, in modules.
export type QrCodePaths = {
    size: number;
    dots: string;
    corners: string;
    logo: { start: number; span: number } | null;
};

function num(value: number): string {
    return String(Math.round(value * 1000) / 1000);
}

export function isFinderModule(size: number, row: number, col: number): boolean {
    const top = row < FINDER;
    const left = col < FINDER;
    return (top && left) || (top && col >= size - FINDER) || (row >= size - FINDER && left);
}

// The logo's side in modules: odd, so it sits exactly on the centre module, and about a fifth of the code.
export function logoSpan(size: number): number {
    const span = Math.floor(size * 0.2);
    return span % 2 === 1 ? span : span - 1;
}

// Error correction H when the logo covers modules (it rebuilds up to 30%), else Q. The logo's square
// and a one-module ring around it are cleared, so no dot touches the logo.
export function qrModules(text: string, centerLogo: boolean) {
    const { size, data } = encode(text, { ecc: centerLogo ? 'H' : 'Q', border: 0 });
    const span = centerLogo ? logoSpan(size) : 0;
    const centre = (size - 1) / 2;
    const clearRadius = (span + 1) / 2;
    const isCleared = (row: number, col: number) => centerLogo && Math.abs(row - centre) <= clearRadius && Math.abs(col - centre) <= clearRadius;
    return {
        size,
        isDataDark: (row: number, col: number) => data[row][col] && !isFinderModule(size, row, col) && !isCleared(row, col),
        logo: centerLogo ? { start: centre - (span - 1) / 2, span } : null,
    };
}

function squareRun(col: number, row: number, length: number): string {
    return `M${col} ${row}h${length}v1h${-length}z`;
}

function roundedSquare(x: number, y: number, side: number, radius: number): string {
    const r = num(radius);
    const straight = num(side - 2 * radius);
    return `M${num(x + radius)} ${num(y)}h${straight}a${r} ${r} 0 0 1 ${r} ${r}v${straight}a${r} ${r} 0 0 1 -${r} ${r}h-${straight}a${r} ${r} 0 0 1 -${r} -${r}v-${straight}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

function circle(cx: number, cy: number, radius: number): string {
    const r = num(radius);
    const diameter = num(2 * radius);
    return `M${num(cx - radius)} ${num(cy)}a${r} ${r} 0 1 0 ${diameter} 0a${r} ${r} 0 1 0 -${diameter} 0z`;
}

function dotsPath(size: number, isDataDark: (row: number, col: number) => boolean, shape: QrDotShape): string {
    const parts: string[] = [];
    for (let row = 0; row < size; row++) {
        if (shape === 'SQUARE') {
            // Runs of dark modules along the row: neighbours inside a run share no anti-aliased seam.
            let start = -1;
            for (let col = 0; col <= size; col++) {
                const dark = col < size && isDataDark(row, col);
                if (dark && start < 0) start = col;
                if (!dark && start >= 0) {
                    parts.push(squareRun(start, row, col - start));
                    start = -1;
                }
            }
            continue;
        }
        for (let col = 0; col < size; col++) {
            if (!isDataDark(row, col)) continue;
            parts.push(shape === 'DOT' ? circle(col + 0.5, row + 0.5, DOT_RADIUS) : roundedSquare(col, row, 1, ROUNDED_RADIUS));
        }
    }
    return parts.join('');
}

// Outer 7 × 7 ring, its 5 × 5 hole and the 3 × 3 centre; evenodd fills the ring and the centre.
function finderPath(x: number, y: number, shape: QrCornerShape): string {
    if (shape === 'CIRCLE') return circle(x + 3.5, y + 3.5, 3.5) + circle(x + 3.5, y + 3.5, 2.5) + circle(x + 3.5, y + 3.5, 1.5);
    if (shape === 'ROUNDED') return roundedSquare(x, y, 7, 2) + roundedSquare(x + 1, y + 1, 5, 1.2) + roundedSquare(x + 2, y + 2, 3, 0.8);
    return `M${x} ${y}h7v7h-7z` + `M${x + 1} ${y + 1}h5v5h-5z` + `M${x + 2} ${y + 2}h3v3h-3z`;
}

export function qrCodePaths(text: string, shapes: QrCodeShapes): QrCodePaths {
    const { size, isDataDark, logo } = qrModules(text, shapes.centerLogo);
    const far = size - FINDER;
    return {
        size,
        dots: dotsPath(size, isDataDark, shapes.dotShape),
        corners: finderPath(0, 0, shapes.cornerShape) + finderPath(far, 0, shapes.cornerShape) + finderPath(0, far, shapes.cornerShape),
        logo,
    };
}
