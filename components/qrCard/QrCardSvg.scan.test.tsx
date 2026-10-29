// @vitest-environment node
import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';

// Rasterizes the card as a phone camera would see a print, and reads the code back.
const SHORT_URL = 'https://storywall.gr/q/7Hk2pQx9Lm';
const LONG_URL = `https://storywall.gr/i/${'a1B2c3D4e5'.repeat(18)}`;

function scan(url: string, style: Partial<QrCardStyle>): string | null {
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
    const image = new Resvg(markup, { fitTo: { mode: 'width', value: 840 }, background: '#FFFFFF', font: { loadSystemFonts: false } }).render();
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
