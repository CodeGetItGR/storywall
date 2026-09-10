import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import type { CostSummaryResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';

export function CostTrackingSummary({ summary }: { summary: CostSummaryResponseDto }) {
    const locale = useLocale();
    const t = useTranslations('AdminPage.costTracking');

    return (
        <>
            {/* Estimated costs */}
            <AdminSection title={t('summary.title')} description={t('summary.description')}>
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div className="border-b border-border pb-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('summary.week')}</dt>
                        <dd className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-ink">
                            {formatMoney(locale, summary.weekEstimatedCostMinor, summary.currency)}
                        </dd>
                    </div>
                    <div className="border-b border-border pb-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('summary.month')}</dt>
                        <dd className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-ink">
                            {formatMoney(locale, summary.monthEstimatedCostMinor, summary.currency)}
                        </dd>
                    </div>
                </dl>
            </AdminSection>

            {/* Provider snapshots */}
            <AdminSection title={t('providers.title')} description={t('providers.description')}>
                {summary.providerActuals.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('providers.empty')}</p>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {summary.providerActuals.map((provider) => (
                            <article key={`${provider.provider}-${provider.fetchedAt}`} className="border border-border bg-card px-4 py-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-ink">{provider.provider.replaceAll('_', ' ')}</h3>
                                        <p className="mt-1 text-xs text-ink-muted">
                                            {t('providers.period', {
                                                start: formatDate(locale, provider.periodStart, { day: 'numeric', month: 'short', year: 'numeric' }),
                                                end: formatDate(locale, provider.periodEnd, { day: 'numeric', month: 'short', year: 'numeric' }),
                                            })}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink">
                                        {provider.amountMinor === null || provider.currency === null
                                            ? t('providers.usageOnly')
                                            : formatMoney(locale, provider.amountMinor, provider.currency)}
                                    </p>
                                </div>
                                <p className="mt-3 text-xs text-ink-faint">
                                    {t('providers.fetched', {
                                        date: formatDate(locale, provider.fetchedAt, {
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            month: 'short',
                                        }),
                                    })}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </AdminSection>
        </>
    );
}
