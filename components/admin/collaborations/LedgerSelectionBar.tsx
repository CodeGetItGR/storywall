'use client';

import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { type CurrencyAmount, formatCurrencyAmounts, missingPayoutFieldLabelKey } from '@/lib/adminCollaborations';

export function LedgerSelectionBar({
    count,
    totals,
    missingPayoutFields,
    onClearAction,
    onMarkPaidAction,
}: {
    count: number;
    totals: CurrencyAmount[];
    missingPayoutFields: string[];
    onClearAction: () => void;
    onMarkPaidAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const tBusiness = useTranslations('AdminPage.collaborations.business.fields');
    const locale = useLocale();
    const blocked = missingPayoutFields.length > 0;
    // The backend refuses a payout until these are filled in (5096).
    const missingText = missingPayoutFields
        .map((column) => {
            const key = missingPayoutFieldLabelKey(column);
            return key ? tBusiness(key) : column;
        })
        .join(', ');

    return (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card px-4 py-3 shadow-[0_-8px_20px_-16px_rgba(18,20,28,0.35)]">
            {/* Selection summary */}
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                    {t('selected', { count })}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    <span className="font-mono text-ink-muted">{formatCurrencyAmounts(locale, totals)}</span>
                </p>
                {blocked && <p className="mt-0.5 text-xs text-status-warn">{t('payoutBlocked', { fields: missingText })}</p>}
            </div>

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
                    disabled={blocked}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('markPaid')}
                </button>
            </div>
        </div>
    );
}
