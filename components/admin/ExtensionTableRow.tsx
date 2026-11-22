'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { ExtensionRow } from '@/lib/adminExtensions';
import { extensionVisibility } from '@/lib/adminExtensions';
import type { Visibility } from '@/lib/adminVisibility';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

// One coverage extension in the Paid services table. It has no name or code of
// its own: its length names it, and it belongs to exactly one plan, shown with
// its event type so plans that share a name stay apart. Extensions
// are listed shortest first, so the order cell stays empty.
export function ExtensionTableRow({
    row,
    statusPill,
    statusDot,
    eventTypeLabel,
    onEditAction,
}: {
    row: ExtensionRow;
    eventTypeLabel: (eventTypeKey: string) => string;
    statusPill: Record<Visibility, string>;
    statusDot: Record<Visibility, string>;
    onEditAction: (row: ExtensionRow) => void;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const { option, plan } = row;
    const status = extensionVisibility(option);
    const monthsLabel = t('plans.columns.months', { count: option.months });

    function handleEditClick() {
        onEditAction(row);
    }

    return (
        <tr className="border-b border-border last:border-b-0 hover:bg-canvas/60">
            {/* Length */}
            <td className="max-w-64 px-4 py-2.5">
                <p className="truncate font-semibold text-ink">{monthsLabel}</p>
            </td>

            {/* Kind */}
            <td className="px-3 py-2.5 text-ink-muted">{t('paidServices.kinds.EXTENSION')}</td>

            {/* Price */}
            <td className="px-3 py-2.5">
                <p className="font-mono text-ink">{formatMoney(locale, option.priceAmountMinor, plan.priceCurrency)}</p>
                <p className="text-[11px] text-ink-faint">{t('paidServices.fields.billingPeriodOnceShort')}</p>
            </td>

            {/* Plan */}
            <td className="max-w-56 px-3 py-2.5">
                <p className="truncate text-ink-muted" title={plan.name}>
                    {plan.name}
                </p>
                {plan.eventTypeKey && <p className="truncate text-[11px] text-ink-faint">{eventTypeLabel(plan.eventTypeKey)}</p>}
            </td>

            {/* Status */}
            <td className="px-3 py-2.5">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', statusPill[status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status])} />
                    {t(`paidServices.status.${status}`)}
                </span>
            </td>

            {/* Order */}
            <td className="px-3 py-2.5" />

            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEditClick}
                    aria-label={t('plans.durations.edit', { duration: monthsLabel })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </td>
        </tr>
    );
}
