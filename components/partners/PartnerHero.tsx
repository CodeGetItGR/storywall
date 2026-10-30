'use client';

import { Handshake } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { PartnerTierProgress } from '@/components/partners/PartnerTierProgress';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import type { PartnerTierProgressDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import type { PartnerBalance } from '@/lib/partnerPortal';
import { cn } from '@/lib/utils';

// The top of the partner page: who the partner is, what they are still owed, and their commission rate.
export function PartnerHero({
    name,
    balances,
    tierProgress,
}: {
    name: string;
    balances: PartnerBalance[];
    tierProgress: PartnerTierProgressDto | null;
}) {
    const t = useTranslations('PartnerPortalPage');
    const locale = useLocale();

    return (
        <section aria-labelledby="partner-name" className={cn(VENDOR_SECTION_SURFACE, 'relative overflow-hidden p-5 sm:p-7')}>
            {/* Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />

            {/* Identity */}
            <div className="relative flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-brand">
                    <Handshake className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <h1 id="partner-name" className="truncate text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl">
                        {name}
                    </h1>
                    <p className="text-sm text-ink-muted">{t('title')}</p>
                </div>
            </div>

            <div className={cn('relative mt-7 grid gap-7', tierProgress && 'sm:grid-cols-2 sm:gap-0')}>
                {/* Balance */}
                <div className={cn(tierProgress && 'sm:pr-8')}>
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

                {/* Commission */}
                {tierProgress && <PartnerTierProgress progress={tierProgress} className="sm:border-l sm:border-border sm:pl-8" />}
            </div>
        </section>
    );
}
