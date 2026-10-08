'use client';

import { useLocale, useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerCardsReport } from '@/hooks/usePartnerCards';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Taps per card design over a date range.
export function PartnerCardsReport() {
    const t = useTranslations('AdminPage.partnerCards.report');
    const tAdmin = useTranslations('AdminPage');
    const tVariants = useTranslations('AdminPage.feedCardVariants');
    const locale = useLocale();
    const { report, fromValue, toValue, handleFromChange, handleToChange } = usePartnerCardsReport();
    const data = report.data;
    const ratio = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

    return (
        <section className="space-y-4">
            {/* Heading and range */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs font-medium text-ink-muted">
                        {t('from')}
                        <input
                            type="date"
                            value={fromValue}
                            max={toValue || undefined}
                            onChange={handleFromChange}
                            className={adminInputClass('mt-1 font-mono')}
                        />
                    </label>
                    <label className="text-xs font-medium text-ink-muted">
                        {t('to')}
                        <input
                            type="date"
                            value={toValue}
                            min={fromValue || undefined}
                            onChange={handleToChange}
                            className={adminInputClass('mt-1 font-mono')}
                        />
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {report.isLoading && <LoadingState label={t('loading')} className="min-h-32" />}
                {report.error && (
                    <p className="px-5 py-10 text-center text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(report.error)}`)}</p>
                )}
                {data && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-5 py-3 font-bold">{t('columns.design')}</th>
                                    <th className="px-3 py-3 text-right font-bold">{t('columns.events')}</th>
                                    <th className="px-3 py-3 text-right font-bold">{t('columns.cardSlots')}</th>
                                    <th className="px-3 py-3 text-right font-bold">{t('columns.clicks')}</th>
                                    <th className="px-3 py-3 text-right font-bold">{t('columns.clicksPerEvent')}</th>
                                    <th className="px-5 py-3 text-right font-bold">{t('columns.clicksPerCardSlot')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.variants.map((row) => (
                                    <tr key={row.variant} className="border-b border-border last:border-b-0">
                                        <td className="px-5 py-3 font-semibold text-ink">{tVariants(row.variant)}</td>
                                        <td className="px-3 py-3 text-right font-mono text-ink">{row.events}</td>
                                        <td className="px-3 py-3 text-right font-mono text-ink">{row.cardSlots}</td>
                                        <td className="px-3 py-3 text-right font-mono text-ink">{row.clicks}</td>
                                        <td className="px-3 py-3 text-right font-mono text-ink">{ratio.format(row.clicksPerEvent)}</td>
                                        <td className="px-5 py-3 text-right font-mono text-ink">{ratio.format(row.clicksPerCardSlot)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Placement */}
            {data && <p className="text-xs text-ink-muted">{t('placement', { firstAfter: data.firstAfter, every: data.every })}</p>}
        </section>
    );
}
