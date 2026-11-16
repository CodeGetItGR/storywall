import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useTranslations } from 'next-intl';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import { PLAIN_FEATURES_QR_CARD_STYLE } from '@/lib/qrCard';
import { QR_CARD_SAMPLE_FEATURES, type QrCardFeature, qrCardFeatures } from '@/lib/qrCardFeatures';

const TITLE = 'Maria & Nikos';

// A card as the host prints it from the event's QR page, in the toolbar's language.
function Card({ features }: { features: QrCardFeature[] }) {
    const t = useTranslations('QrCardPage');
    const featureTexts = useQrCardFeatureTexts();
    return (
        <div className="mx-auto w-full max-w-xs">
            <QrCardSvg
                style={PLAIN_FEATURES_QR_CARD_STYLE}
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
export const NoTiles: Story = { args: { features: [] } };
