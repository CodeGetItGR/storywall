'use client';

import { useTranslations } from 'next-intl';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import type { QrCardStyle } from '@/lib/qrCard';

// Never resolves to an event: the code only has to scan the way a real one would.
const SAMPLE_URL = 'https://storywall.gr/q/preview';

// The card as a host would print it, drawn by the same QrCardSvg with a sample link and line.
export function QrCardTemplatePreview({ style, title }: { style: QrCardStyle; title: string }) {
    const t = useTranslations('AdminPage.qrCards.preview');

    return (
        <figure>
            {/* Caption */}
            <figcaption className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('label')}</figcaption>
            {/* Card */}
            <div className="mx-auto w-full max-w-60 overflow-hidden rounded-lg border border-border">
                <QrCardSvg
                    style={style}
                    url={SAMPLE_URL}
                    title={title}
                    lines={[{ text: t('sampleLine'), tone: 'body' }]}
                    label={t('cardLabel', { title })}
                    className="block h-auto w-full"
                />
            </div>
            <ThemeFontFace font={style.headingFont} />
        </figure>
    );
}
