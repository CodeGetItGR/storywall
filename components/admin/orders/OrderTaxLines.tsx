'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { AdminOrderTaxLine } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { numberFormat } from '@/lib/format';

// The rates behind the tax total: rate, country and why Stripe taxed it so, one line each.
export function OrderTaxLines({ lines, currency }: { lines: AdminOrderTaxLine[]; currency: string }) {
    const t = useTranslations('AdminPage.orders.detail.price');
    const locale = useLocale();
    const percent = numberFormat(locale, { style: 'percent', maximumFractionDigits: 4 });

    return (
        <ul className="space-y-1 border-l-2 border-border pl-3">
            {lines.map((line, index) => {
                const reason = line.taxabilityReason;
                const parts = [
                    line.ratePercent !== null ? percent.format(line.ratePercent / 100) : null,
                    line.country,
                    reason ? (t.has(`taxReason.${reason}`) ? t(`taxReason.${reason}`) : reason) : null,
                ].filter(Boolean);

                return (
                    <li key={index} className="flex justify-between gap-6 text-xs">
                        <span className="min-w-0 text-ink-muted">{parts.join(' · ')}</span>
                        <span className="shrink-0 font-mono text-ink-muted tabular-nums">{formatMoney(locale, line.amountMinor, currency)}</span>
                    </li>
                );
            })}
        </ul>
    );
}
