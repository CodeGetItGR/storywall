'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { QrLinkStatsDto } from '@/lib/api/types';

type QrStatsPreviewProps = {
    stats: QrLinkStatsDto;
    // Slots left, shown only when it is running low.
    lowSlots: number | null;
    onSeeMore: () => void;
};

// A glimpse of the share link's numbers, with "See more" opening the full stats sheet.
export function QrStatsPreview({ stats, lowSlots, onSeeMore }: QrStatsPreviewProps) {
    const t = useTranslations('ManagePage.qr.stats');

    return (
        <section aria-label={t('title')} className="flex flex-col gap-3 rounded-[20px] bg-surface-muted px-4 py-3.5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-ink-muted">{t('title')}</h3>
                <button
                    type="button"
                    onClick={onSeeMore}
                    className="-my-1 flex shrink-0 items-center gap-0.5 rounded-full py-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                >
                    {t('seeMore')}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>

            {/* Numbers */}
            <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <dt className="text-xs leading-tight font-semibold text-ink-muted">{t('joined')}</dt>
                    <dd className="mt-auto text-lg leading-tight font-bold text-ink tabular-nums">{stats.joinCount}</dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-xs leading-tight font-semibold text-ink-muted">{t('uploads')}</dt>
                    <dd className="mt-auto text-lg leading-tight font-bold text-ink tabular-nums">{stats.uploadCount}</dd>
                </div>
            </dl>

            {/* Low slots */}
            {lowSlots !== null && (
                <p className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('lowSlots', { count: lowSlots })}
                </p>
            )}
        </section>
    );
}
