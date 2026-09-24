'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { AdminDurationPick } from '@/hooks/useAdminDurationPick';
import { formatOptionalMoney } from '@/lib/billing';

// Options for a plan's live durations, labelled "6 months · €49.00". A
// defaultLabel adds a first, empty option that lets the server choose.
export function AdminDurationSelect({
    pick,
    currency,
    defaultLabel,
    className,
}: {
    pick: AdminDurationPick;
    currency: string | null;
    defaultLabel?: string;
    className?: string;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <select value={pick.optionId} onChange={pick.handleChange} disabled={pick.options.length === 0} className={className}>
            {defaultLabel && <option value="">{defaultLabel}</option>}
            {pick.options.map((option) => (
                <option key={option.id} value={option.id}>
                    {`${t('plans.columns.months', { count: option.months })} · ${formatOptionalMoney(option.priceAmountMinor, currency, locale)}`}
                </option>
            ))}
        </select>
    );
}
