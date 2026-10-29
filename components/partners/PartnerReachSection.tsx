'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PartnerPortalReachDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { formatReachCount } from '@/lib/vendorReach';

const TOTALS = ['events', 'guests', 'proViews', 'postViewers', 'listTaps'] as const;

// The partner's reach across their events as a vendor. Rows carry a date and a type, never an event's name (KAN-28).
export function PartnerReachSection({ reach }: { reach: PartnerPortalReachDto }) {
    const t = useTranslations('PartnerPortalPage.reach');
    const tVendors = useTranslations('Vendors');
    const locale = useLocale();

    return (
        <section aria-labelledby="partner-reach-title" className="pt-10">
            {/* Title */}
            <h2 id="partner-reach-title" className="text-base font-bold text-ink">
                {t('title')}
            </h2>

            {reach.events === 0 ? (
                <p className="mt-4 rounded-lg bg-surface-muted/55 p-4 text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Totals */}
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {TOTALS.map((key) => (
                            <div key={key} className="rounded-lg bg-surface-muted/55 p-4">
                                <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t(key)}</dt>
                                <dd className="mt-2 text-2xl font-bold text-ink tabular-nums">{formatReachCount(locale, reach[key])}</dd>
                            </div>
                        ))}
                    </dl>

                    {/* Recent events */}
                    <h3 className="mt-6 text-sm font-semibold text-ink">{t('recentTitle')}</h3>
                    <div className="mt-3 overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
                        <table className="w-full min-w-[480px] text-left text-sm">
                            <thead className="bg-surface-muted/70 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                <tr>
                                    <th scope="col" className="px-4 py-3">
                                        {t('date')}
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        {t('type')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        {t('guests')}
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right">
                                        {t('views')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {reach.recent.map((row, i) => (
                                    <tr key={`${row.startAt}-${i}`}>
                                        <td className="px-4 py-3 text-ink">{formatDate(locale, row.startAt, { dateStyle: 'medium' })}</td>
                                        <td className="px-4 py-3 text-ink">{tVendors(`types.${row.vendorType}`)}</td>
                                        <td className="px-4 py-3 text-right text-ink tabular-nums">{formatReachCount(locale, row.guests)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                                            {formatReachCount(locale, row.views)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
