'use client';

import { Activity, CalendarDays, type LucideIcon, RefreshCw, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { useAdminMetrics } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { formatMoney } from '@/lib/billing';
import { formatBytes, formatCount } from '@/lib/format';

function MetricTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
    return (
        <div className="border-b border-border bg-surface-muted/35 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-muted">{label}</p>
                <Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" />
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">{formatCount(value)}</p>
        </div>
    );
}

function MetricBreakdown({ title, values }: { title: string; values: Record<string, number> }) {
    const entries = Object.entries(values).sort(([left], [right]) => left.localeCompare(right));

    return (
        <AdminSection title={title} className="border-0 pt-0">
            {entries.length === 0 ? (
                <p className="text-sm text-ink-muted">0</p>
            ) : (
                <dl className="divide-y divide-border">
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4 py-2">
                            <dt className="min-w-0 truncate text-sm font-semibold text-ink">{key}</dt>
                            <dd className="text-sm font-bold tabular-nums text-ink-muted">{formatCount(value)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </AdminSection>
    );
}

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

            {metricsQuery.isLoading && <p className="text-sm text-ink-muted">{t('metrics.loading')}</p>}
            {metricsQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(metricsQuery.error)}`)}</p>}
            {metrics && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label={t('metrics.totalUsers')} value={metrics.totalUsers} icon={Users} />
                        <MetricTile label={t('metrics.activeUsers')} value={metrics.activeUsers} icon={Activity} />
                        <MetricTile label={t('metrics.totalEvents')} value={metrics.totalEvents} icon={CalendarDays} />
                        <MetricTile label={t('metrics.activeEvents')} value={metrics.activeEvents} icon={Activity} />
                    </div>
                    <div className="grid gap-7 lg:grid-cols-3">
                        <MetricBreakdown title={t('metrics.usersByAccountPlan')} values={metrics.usersByAccountPlan} />
                        <MetricBreakdown title={t('metrics.eventsByStatus')} values={metrics.eventsByStatus} />
                        <MetricBreakdown title={t('metrics.eventsByPlanTier')} values={metrics.eventsByPlanTier} />
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
