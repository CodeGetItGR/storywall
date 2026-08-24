'use client';

import { Activity, CalendarDays, RefreshCw, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { PlatformMetricBreakdown } from '@/components/admin/PlatformMetricBreakdown';
import { PlatformMetricTile } from '@/components/admin/PlatformMetricTile';
import { PlatformNeedsAttention } from '@/components/admin/PlatformNeedsAttention';
import { useAdminMetrics } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { formatMoney } from '@/lib/billing';
import { formatBytes } from '@/lib/format';

export function PlatformMetricsPanel() {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const metricsQuery = useAdminMetrics();
    const metrics = metricsQuery.data;
    function handleRefresh() {
        metricsQuery.refetch();
    }

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('metrics.eyebrow')}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t('metrics.title')}</h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">{t('metrics.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={metricsQuery.isFetching}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                >
                    <RefreshCw className={metricsQuery.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    {t('metrics.refresh')}
                </button>
            </div>

            <PlatformNeedsAttention />

            {metricsQuery.isLoading && <p className="text-sm text-ink-muted">{t('metrics.loading')}</p>}
            {metricsQuery.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(metricsQuery.error)}`)}</p>}
            {metrics && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <PlatformMetricTile label={t('metrics.totalUsers')} value={metrics.totalUsers} icon={Users} />
                        <PlatformMetricTile label={t('metrics.activeUsers')} value={metrics.activeUsers} icon={Activity} />
                        <PlatformMetricTile label={t('metrics.totalEvents')} value={metrics.totalEvents} icon={CalendarDays} />
                        <PlatformMetricTile label={t('metrics.activeEvents')} value={metrics.activeEvents} icon={Activity} />
                    </div>
                    <div className="grid gap-7 lg:grid-cols-3">
                        <PlatformMetricBreakdown title={t('metrics.usersByAccountPlan')} values={metrics.usersByAccountPlan} />
                        <PlatformMetricBreakdown title={t('metrics.eventsByStatus')} values={metrics.eventsByStatus} />
                        <PlatformMetricBreakdown title={t('metrics.eventsByPlanTier')} values={metrics.eventsByPlanTier} />
                    </div>
                    <AdminSection title={t('metrics.storage.title')}>
                        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                            {(
                                [
                                    ['usedBytes', formatBytes(metrics.storage.usedBytes)],
                                    ['pendingPurgeBytes', formatBytes(metrics.storage.pendingPurgeBytes)],
                                    ['committedBytes', formatBytes(metrics.storage.committedBytes)],
                                    ['paidUsedBytes', formatBytes(metrics.storage.paidUsedBytes)],
                                    ['freeUsedBytes', formatBytes(metrics.storage.freeUsedBytes)],
                                    ['purchasedExtraBytes', formatBytes(metrics.storage.purchasedExtraBytes)],
                                    [
                                        'estimatedMonthlyCostMinor',
                                        formatMoney(locale, metrics.storage.estimatedMonthlyCostMinor, metrics.storage.costCurrency),
                                    ],
                                ] as const
                            ).map(([key, value]) => (
                                <div key={key} className="border-b border-border pb-3">
                                    <dt className="text-xs text-ink-muted">{t(`metrics.storage.${key}`)}</dt>
                                    <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </AdminSection>
                </>
            )}
        </section>
    );
}
