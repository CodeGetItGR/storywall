'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { CollaborationEarningsTotalDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

export function CollaboratorOwedTotals({ totals }: { totals: CollaborationEarningsTotalDto[] }) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const locale = useLocale();

    if (totals.length === 0) return null;

    return (
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {totals.map((total) => (
                <div key={total.currency}>
                    <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('owed', { currency: total.currency })}</dt>
                    <dd className="mt-0.5 font-mono text-xl font-bold text-ink tabular-nums">{formatMoney(locale, total.accruedMinor, total.currency)}</dd>
                    <dd className="font-mono text-xs text-ink-muted">{t('paid', { amount: formatMoney(locale, total.paidMinor, total.currency) })}</dd>
                </div>
            ))}
        </dl>
    );
}
