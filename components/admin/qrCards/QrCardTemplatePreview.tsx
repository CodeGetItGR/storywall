'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import { QR_CARD_SAMPLE_URL } from '@/lib/adminQrCards';
import { qrCardSampleFieldTexts, type QrCardStyle } from '@/lib/qrCard';
import { QR_CARD_SAMPLE_FEATURES } from '@/lib/qrCardFeatures';
import { qrCardLineWording } from '@/lib/qrCardLayout';

// The card as a host would print it, drawn by the same QrCardSvg with a sample link and line.
export function QrCardTemplatePreview({ style, title }: { style: QrCardStyle; title: string }) {
    const t = useTranslations('AdminPage.qrCards.preview');
    const locale = useLocale();
    const featureTexts = useQrCardFeatureTexts();

    return (
        <figure>
            {/* Caption */}
            <figcaption className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('label')}</figcaption>
            {/* Card */}
            <div className="mx-auto w-full max-w-60 overflow-hidden rounded-lg border border-border">
                <QrCardSvg
                    style={style}
                    url={QR_CARD_SAMPLE_URL}
                    title={title}
                    lines={[{ text: qrCardLineWording(style.layout, 'join', locale) ?? t('sampleLine'), tone: 'body' }]}
                    fields={qrCardSampleFieldTexts(style.layout, locale)}
                    label={t('cardLabel', { title })}
                    features={QR_CARD_SAMPLE_FEATURES}
                    featureTexts={featureTexts}
                    className="block h-auto w-full"
                />
            </div>
            <ThemeFontFace font={style.headingFont} />
        </figure>
    );
}
