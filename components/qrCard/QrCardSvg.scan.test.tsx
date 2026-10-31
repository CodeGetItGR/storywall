// @vitest-environment node
import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

// Rasterizes the card as a phone camera would see a print, and reads the code back.
const SHORT_URL = 'https://storywall.gr/q/7Hk2pQx9Lm';
const LONG_URL = `https://storywall.gr/i/${'a1B2c3D4e5'.repeat(18)}`;

function scan(url: string, style: Partial<QrCardStyle>, width = 840): string | null {
    const markup = renderToStaticMarkup(
        <QrCardSvg
            style={{ ...PLAIN_QR_CARD_STYLE, ...style }}
            url={url}
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
        />,
    );
    // No fonts: text doesn't matter here, and loading system fonts per render is slow.
    const image = new Resvg(markup, { fitTo: { mode: 'width', value: width }, background: '#FFFFFF', font: { loadSystemFonts: false } }).render();
    return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

const CASES = [true, false].flatMap((centerLogo) => [
    { link: 'short', url: SHORT_URL, centerLogo },
    { link: 'long', url: LONG_URL, centerLogo },
]);

describe('QrCardSvg scans', () => {
    it.each(CASES)('a $link link, logo $centerLogo', ({ url, centerLogo }) => {
        expect(scan(url, { centerLogo })).toBe(url);
    });
});

const L = DEFAULT_QR_CARD_LAYOUT;
// The code moved to the bottom right, the text above it.
const MOVED = {
    title: { ...L.title, height: 20 },
    code: { x: 47, y: 90, size: 50, panel: true, radius: 2 },
    lines: { ...L.lines, y: 40, height: 40 },
};
// The smallest code the backend allows.
const SMALLEST = { ...L, code: { ...L.code, x: 37.5, y: 55, size: 30 } };

describe('QrCardSvg scans with a layout', () => {
    it.each([
        { name: 'a moved, resized code', layout: MOVED, width: 840 },
        { name: 'the smallest code, at A6 export size', layout: SMALLEST, width: 1240 },
        { name: 'the panel off on a white card', layout: { ...L, code: { ...L.code, panel: false } }, width: 840 },
        { name: 'the default layout at A5 export size', layout: L, width: 1748 },
    ])('$name', ({ layout, width }) => {
        for (const url of [SHORT_URL, LONG_URL]) {
            for (const centerLogo of [true, false]) {
                expect(scan(url, { layout, centerLogo }, width)).toBe(url);
            }
        }
    });
});
