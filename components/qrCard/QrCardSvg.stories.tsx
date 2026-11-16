import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import { PLAIN_FEATURES_QR_CARD_STYLE, PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { QR_CARD_SAMPLE_FEATURES, type QrCardFeature, qrCardFeatures } from '@/lib/qrCardFeatures';
import { addLogo, DEFAULT_QR_CARD_LAYOUT, FEATURES_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

const TITLE = 'Maria & Nikos';
// A dark navy artwork, drawn inline so the story never waits on a file.
const DARK_ARTWORK = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="105" height="148"><rect width="105" height="148" fill="#1F2A44"/></svg>',
)}`;
const WITH_LOGO = addLogo(DEFAULT_QR_CARD_LAYOUT);

// The card without tiles, as the gift card draws it.
function plain(overrides: Partial<QrCardStyle>): QrCardStyle {
    return { ...PLAIN_QR_CARD_STYLE, ...overrides };
}

// A card as the host prints it from the event's QR page, in the toolbar's language.
function Card({ features, style = PLAIN_FEATURES_QR_CARD_STYLE }: { features: QrCardFeature[]; style?: QrCardStyle }) {
    const t = useTranslations('QrCardPage');
    const featureTexts = useQrCardFeatureTexts();
    return (
        <div className="mx-auto w-full max-w-xs">
            <QrCardSvg
                style={style}
                url="https://storywall.gr/q/7Hk2pQx9Lm"
                title={TITLE}
                lines={[{ text: t('lines.join'), tone: 'body' }]}
                label={t('cardLabel', { title: TITLE })}
                features={features}
                featureTexts={featureTexts}
                className="block h-auto w-full"
            />
        </div>
    );
}

const meta = {
    title: 'QrCard/QrCardSvg',
    component: Card,
    // The card is a fixed-ratio drawing, so the desktop width shows nothing new.
    tags: ['visual-mobile-only'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullPlan: Story = { args: { features: QR_CARD_SAMPLE_FEATURES } };
export const ThreeTiles: Story = { args: { features: ['posts', 'stories', 'wishes'] } };
export const TwoTiles: Story = { args: { features: ['posts', 'music'] } };
export const GalleryOnly: Story = { args: { features: qrCardFeatures([{ moduleKey: 'gallery', isAvailable: true }]) } };
export const WithBackups: Story = {
    args: { features: qrCardFeatures(['gallery', 'wishbook', 'he_or_she', 'wishlist', 'schedule'].map((moduleKey) => ({ moduleKey, isAvailable: true }))) },
};
export const NoTiles: Story = { args: { features: [] } };

// The logo in its brand colours, where Add logo puts it on a card without tiles.
export const Logo: Story = { args: { features: [], style: plain({ layout: WITH_LOGO }) } };

// The logo across the top in one colour on dark artwork: the sparkle shows the artwork through.
export const LogoOneColourOnDarkArtwork: Story = {
    args: {
        features: [],
        style: plain({
            artworkUrl: DARK_ARTWORK,
            textColor: '#FFFFFF',
            codeColor: '#1F2A44',
            layout: {
                ...WITH_LOGO,
                title: { ...DEFAULT_QR_CARD_LAYOUT.title!, y: 27, height: 12 },
                logo: { x: 8, y: 8, width: 89, color: '#FFFFFF' },
            },
        }),
    },
};

// Add logo on the event's card: the tiles get shorter and the logo sits under them.
export const LogoUnderTiles: Story = {
    args: { features: QR_CARD_SAMPLE_FEATURES, style: { ...PLAIN_FEATURES_QR_CARD_STYLE, layout: addLogo(FEATURES_QR_CARD_LAYOUT) } },
};

// The smallest logo, 20 mm wide.
export const LogoSmallest: Story = {
    args: { features: [], style: plain({ layout: { ...WITH_LOGO, logo: { x: 42.5, y: 129.7, width: 20, color: null } } }) },
};
