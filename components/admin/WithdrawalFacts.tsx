'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatWithdrawalFacts } from '@/lib/adminWithdrawals';

export function WithdrawalFacts({ usageFacts }: { usageFacts: Record<string, unknown> | null }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const facts = formatWithdrawalFacts(usageFacts, locale);

    if (facts.length === 0) return null;

    return (
        <section className="min-w-0">
            {/* Heading */}
            <h4 className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('withdrawals.usageFacts')}</h4>

            {/* Facts */}
            <dl className="mt-2 grid max-w-3xl gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {facts.map(({ key, value }) => (
                    <div key={key} className="flex min-w-0 items-baseline justify-between gap-4 text-sm">
                        <dt className="text-ink-muted">{t(`withdrawals.facts.${key}`)}</dt>
                        <dd className="text-right font-medium text-ink tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
