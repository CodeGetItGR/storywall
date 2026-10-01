'use client';

import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { type CurrencyAmount, formatCurrencyAmounts } from '@/lib/adminCollaborations';

export function LedgerSelectionBar({
    count,
    totals,
    onClearAction,
    onMarkPaidAction,
}: {
    count: number;
    totals: CurrencyAmount[];
    onClearAction: () => void;
    onMarkPaidAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const locale = useLocale();

    return (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card px-4 py-3 shadow-[0_-8px_20px_-16px_rgba(18,20,28,0.35)]">
            {/* Selection summary */}
            <p className="text-sm font-semibold text-ink">
                {t('selected', { count })}
                <span className="mx-1.5 text-ink-faint">·</span>
                <span className="font-mono text-ink-muted">{formatCurrencyAmounts(locale, totals)}</span>
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onClearAction}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    {t('clear')}
                </button>
                <button
                    type="button"
                    onClick={onMarkPaidAction}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('markPaid')}
                </button>
            </div>
        </div>
    );
}
