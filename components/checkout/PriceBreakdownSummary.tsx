'use client';

import { useTranslations } from 'next-intl';

import { usePriceBreakdownView } from '@/hooks/usePriceBreakdownView';
import type { PriceBreakdown } from '@/lib/api/types';

// The server's price for a purchase, item by item, with what a withdrawal does to each.
// `showTotal` is off where the page already shows the total elsewhere.
export function PriceBreakdownSummary({ breakdown, showTotal = true }: { breakdown: PriceBreakdown; showTotal?: boolean }) {
    const t = useTranslations('PriceBreakdown');
    const view = usePriceBreakdownView(breakdown);
    if (!view) return null;

    return (
        <div>
            {/* Items */}
            <ul className="space-y-3">
                {view.items.map((item) => (
                    <li key={item.key} className="flex items-start justify-between gap-6 text-sm">
                        <div className="min-w-0">
                            <p className="text-ink">{item.label}</p>
                            {item.rule && <p className="mt-0.5 text-xs text-ink-muted">{item.rule}</p>}
                        </div>
                        <p className="shrink-0 text-right tabular-nums">
                            {item.listPrice && <span className="mr-1.5 text-xs text-ink-faint line-through">{item.listPrice}</span>}
                            <span className="font-semibold text-ink">{item.price}</span>
                        </p>
                    </li>
                ))}
            </ul>

            {/* Discounts */}
            {view.discounts.length > 0 && (
                <p className="mt-3 text-xs font-semibold text-emerald-700">{t('discountsIncluded', { discounts: view.discounts.join(', ') })}</p>
            )}

            {/* Total */}
            {showTotal && (
                <div className="mt-5 flex items-center justify-between gap-6">
                    <p className="text-sm font-semibold text-ink">{t('total')}</p>
                    <p className="shrink-0 text-xl font-bold text-ink tabular-nums">{view.total}</p>
                </div>
            )}

            {/* VAT and withdrawal window */}
            {(view.vatNote || view.withdrawWithin) && (
                <p className="mt-2 text-xs text-ink-muted">{[view.vatNote, view.withdrawWithin].filter(Boolean).join(' ')}</p>
            )}
        </div>
    );
}
