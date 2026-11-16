// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_FEATURES_QR_CARD_STYLE, PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';
import type { QrCardFeature, QrCardFeatureTexts } from '@/lib/qrCardFeatures';

const TEXTS: QrCardFeatureTexts = {
    labels: { posts: 'Posts', stories: 'Stories', wishes: 'Wishes', reactions: 'Reactions', music: 'Music' },
    wish: 'So happy to celebrate with you!',
    songs: ['September', 'Dancing Queen', 'Perfect'],
};

function markup(features: QrCardFeature[], style = PLAIN_FEATURES_QR_CARD_STYLE) {
    return renderToStaticMarkup(
        <QrCardSvg
            style={style}
            url="https://storywall.gr/q/7Hk2pQx9Lm"
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
            features={features}
            featureTexts={TEXTS}
        />,
    );
}

function count(html: string, pattern: RegExp) {
    return html.match(pattern)?.length ?? 0;
}

describe('QrCardSvg tiles', () => {
    it('draws one tile and one label per feature', () => {
        const html = markup(['posts', 'stories', 'music']);
        expect(count(html, /data-qr-feature="/g)).toBe(3);
        expect(html).toContain('>Posts<');
        expect(html).toContain('>Stories<');
        expect(html).toContain('>Music<');
        expect(html).not.toContain('>Wishes<');
    });

    it('draws nothing for no features', () => {
        expect(count(markup([]), /data-qr-feature="/g)).toBe(0);
    });

    it('draws nothing on a layout without a tiles box', () => {
        expect(count(markup(['posts'], PLAIN_QR_CARD_STYLE), /data-qr-feature="/g)).toBe(0);
    });

    it('draws the tiles before the code, so the code stays on top', () => {
        const html = markup(['posts']);
        expect(html.indexOf('data-qr-feature')).toBeGreaterThan(-1);
        expect(html.indexOf('data-qr-feature')).toBeLessThan(html.indexOf('data-qr-code'));
    });
});
