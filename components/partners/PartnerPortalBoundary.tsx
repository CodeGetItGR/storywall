'use client';

import { Banknote, CalendarCheck2, Handshake } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { usePartnerPortal } from '@/hooks/usePartnerPortal';
import type { PartnerPortalTotalDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

function balanceMinor(total: PartnerPortalTotalDto): number {
    return total.accruedMinor - total.paidMinor;
}

export function PartnerPortalBoundary({ token }: { token: string }) {
    const t = useTranslations('PartnerPortalPage');
    const locale = useLocale();
    const portal = usePartnerPortal(token);
    const handleRetry = useCallback(() => {
        void portal.refetch();
    }, [portal]);

    if (portal.isLoading) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-background px-6">
                <LoadingState label={t('loading')} />
            </main>
        );
    }

    if (portal.error || !portal.data) {
        return (
            <PageErrorState
                title={t('unavailable.title')}
                description={t('unavailable.description')}
                onRetryAction={handleRetry}
            />
        );
    }

    return (
        <main className="min-h-dvh bg-background px-4 py-8 text-ink sm:px-6 sm:py-12">
            <div className="mx-auto w-full max-w-4xl">
                {/* Header */}
                <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Handshake className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{portal.data.name}</h1>
                        <p className="mt-2 text-sm text-ink-muted">{t('title')}</p>
                    </div>
                </header>

                {/* Summary */}
                <section className="grid gap-3 py-6 sm:grid-cols-2" aria-label={t('summary')}>
                    <div className="rounded-lg bg-surface-muted/55 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                            {t('eventsReferred')}
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-ink">{portal.data.eventsReferred}</p>
                    </div>
                    <div className="rounded-lg bg-surface-muted/55 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            <Banknote className="h-4 w-4" aria-hidden="true" />
                            {t('currencies')}
                        </div>
                        <p className="mt-3 text-3xl font-bold tabular-nums text-ink">{portal.data.totals.length}</p>
                    </div>
                </section>

                {/* Totals */}
                <section aria-labelledby="partner-totals-title">
                    <h2 id="partner-totals-title" className="text-base font-bold text-ink">
                        {t('totals.title')}
                    </h2>
                    {portal.data.totals.length === 0 ? (
                        <p className="mt-4 rounded-lg bg-surface-muted/55 p-4 text-sm text-ink-muted">{t('totals.empty')}</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
                            <table className="w-full min-w-[560px] text-left text-sm">
                                <thead className="bg-surface-muted/70 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">
                                            {t('totals.currency')}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right">
                                            {t('totals.accrued')}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right">
                                            {t('totals.paid')}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right">
                                            {t('totals.balance')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {portal.data.totals.map((total) => (
                                        <tr key={total.currency}>
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{total.currency}</td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                                                {formatMoney(locale, total.accruedMinor, total.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
                                                {formatMoney(locale, total.paidMinor, total.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                                                {formatMoney(locale, balanceMinor(total), total.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
