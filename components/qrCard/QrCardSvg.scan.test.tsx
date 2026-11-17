// @vitest-environment node
import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_FEATURES_QR_CARD_STYLE, PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { QR_CARD_SAMPLE_FEATURES, type QrCardFeature, type QrCardFeatureTexts } from '@/lib/qrCardFeatures';
import { DEFAULT_QR_CARD_LAYOUT, DEFAULT_QR_CARD_TITLE } from '@/lib/qrCardLayout';

// Rasterizes the card as a phone camera would see a print, and reads the code back.
const SHORT_URL = 'https://storywall.gr/q/7Hk2pQx9Lm';
const LONG_URL = `https://storywall.gr/i/${'a1B2c3D4e5'.repeat(18)}`;

function scan(url: string, style: Partial<QrCardStyle>, width = 840, features: QrCardFeature[] = [], featureTexts?: QrCardFeatureTexts): string | null {
    const markup = renderToStaticMarkup(
        <QrCardSvg
            style={{ ...PLAIN_QR_CARD_STYLE, ...style }}
            url={url}
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
            features={features}
            featureTexts={featureTexts}
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
    title: { ...DEFAULT_QR_CARD_TITLE, height: 20 },
    code: { x: 47, y: 90, size: 50, panel: true, radius: 2 },
    lines: { ...L.lines, y: 40, height: 40 },
    fields: [],
    features: null,
    logo: null,
};
// The smallest code the backend allows.
const SMALLEST = { ...L, code: { ...L.code, x: 37.5, y: 55, size: 30 } };

describe('QrCardSvg scans with a layout', () => {
    it.each([
        { name: 'a moved, resized code', layout: MOVED, width: 840 },
        { name: 'the smallest code, at A6 export size', layout: SMALLEST, width: 1240 },
        { name: 'the panel off on a white card', layout: { ...L, code: { ...L.code, panel: false } }, width: 840 },
        { name: 'the default layout at A5 export size', layout: L, width: 1748 },
        { name: 'a logo right under the code', layout: { ...L, logo: { x: 30, y: 104, width: 45, color: null } }, width: 840 },
    ])('$name', ({ layout, width }) => {
        for (const url of [SHORT_URL, LONG_URL]) {
            for (const centerLogo of [true, false]) {
                expect(scan(url, { layout, centerLogo }, width)).toBe(url);
            }
        }
    });
});

const TEXTS: QrCardFeatureTexts = {
    labels: { posts: 'Posts', stories: 'Stories', wishes: 'Wishes', reactions: 'Reactions', music: 'Music', games: 'Games', gifts: 'Gifts', schedule: 'Schedule' },
    wish: 'So happy to celebrate with you!',
    songs: ['September', 'Dancing Queen', 'Perfect'],
    game: { question: "Who said 'I love you' first?", answers: ['Him', 'Her'] },
    gift: { title: 'For our honeymoon', copy: 'Copy' },
    schedule: ['Ceremony', 'Welcome drinks'],
};

// The card with pictures has a 46 mm code. A real /q/ link reads at the lower render too; the long link's
// smaller modules need the A6 print's own 300 dpi (1240 px across).
const A6_PRINT_WIDTH = 1240;

describe('QrCardSvg scans with picture tiles', () => {
    it.each(CASES)('a $link link at 46 mm, logo $centerLogo', ({ link, url, centerLogo }) => {
        const width = link === 'long' ? A6_PRINT_WIDTH : 840;
        expect(scan(url, { ...PLAIN_FEATURES_QR_CARD_STYLE, centerLogo }, width, QR_CARD_SAMPLE_FEATURES, TEXTS)).toBe(url);
    });
});
