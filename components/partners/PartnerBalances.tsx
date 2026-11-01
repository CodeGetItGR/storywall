'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PartnerBalance } from '@/lib/partnerPortal';

// What a partner is still owed, per currency, with what they earned and were paid below it.
export function PartnerBalances({ balances }: { balances: PartnerBalance[] }) {
    const t = useTranslations('PartnerPortalPage');
    const locale = useLocale();

    return (
        <div>
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('totals.title')}</p>
            {balances.length === 0 ? (
                <p className="mt-2 text-lg font-semibold text-ink">{t('totals.empty')}</p>
            ) : (
                <ul className="mt-1 flex flex-col gap-3">
                    {balances.map((balance) => (
                        <li key={balance.currency}>
                            <p className="text-4xl font-extrabold tracking-tight text-ink tabular-nums">
                                {formatMoney(locale, balance.owedMinor, balance.currency)}
                            </p>
                            <p className="mt-1 text-sm text-ink-muted tabular-nums">
                                {t('totals.earnedPaid', {
                                    earned: formatMoney(locale, balance.earnedMinor, balance.currency),
                                    paid: formatMoney(locale, balance.paidMinor, balance.currency),
                                })}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
