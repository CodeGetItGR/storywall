'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PrintTotals } from '@/lib/printPicks';
import { PRINT_CURRENCY, printTotalParts } from '@/lib/printPicks';

// The sheet's total as label/value rows: "Included · 2 of 2", then "1 more · €3.50".
export function PrintTotalRows({ totals }: { totals: PrintTotals }) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    let included: { used: number; included: number } | null = null;
    let beyond: { count: number; cents: number | null } | null = null;
    for (const part of printTotalParts(totals)) {
        if (part.key === 'included') included = part;
        else if (part.key === 'beyond') beyond = { count: part.count, cents: null };
        else if (beyond) beyond.cents = part.cents;
    }
    if (!included && !beyond) return null;

    return (
        <dl className="flex flex-col gap-1 text-sm">
            {/* Included */}
            {included && (
                <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-muted">{t('includedLabel')}</dt>
                    <dd className="font-semibold text-ink tabular-nums">
                        {t('includedValue', { used: included.used, included: included.included })}
                    </dd>
                </div>
            )}

            {/* Beyond the package */}
            {beyond && (
                <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-muted">{t('beyond', { count: beyond.count })}</dt>
                    <dd className="text-right font-semibold text-ink tabular-nums">
                        {beyond.cents === null ? t('noPrice') : formatMoney(locale, beyond.cents, PRINT_CURRENCY)}
                    </dd>
                </div>
            )}
        </dl>
    );
}
