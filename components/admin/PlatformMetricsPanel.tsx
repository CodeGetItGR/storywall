'use client';

import { useTranslations } from 'next-intl';

import { PlatformEventsGroup } from '@/components/admin/PlatformEventsGroup';
import { PlatformMetricsHeader } from '@/components/admin/PlatformMetricsHeader';
import { PlatformNeedsAttention } from '@/components/admin/PlatformNeedsAttention';
import { PlatformNewsletterGroup } from '@/components/admin/PlatformNewsletterGroup';
import { PlatformStorageGroup } from '@/components/admin/PlatformStorageGroup';
import { PlatformUsersGroup } from '@/components/admin/PlatformUsersGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePlatformMetrics } from '@/hooks/usePlatformMetrics';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PlatformMetricsPanel() {
    const t = useTranslations('AdminPage');
    const { metrics, shares, updatedAt, isLoading, isFetching, error, refresh } = usePlatformMetrics();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <PlatformMetricsHeader updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Needs attention */}
                <PlatformNeedsAttention />

                {isLoading && <LoadingState label={t('metrics.loading')} className="justify-start" />}
                {error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

                {metrics && shares && (
                    <>
                        {/* Users and events */}
                        <div className="grid gap-5 lg:grid-cols-2">
                            <PlatformUsersGroup total={metrics.totalUsers} active={metrics.activeUsers} byAccountPlan={shares.usersByAccountPlan} />
                            <PlatformEventsGroup
                                total={metrics.totalEvents}
                                active={metrics.activeEvents}
                                byStatus={shares.eventsByStatus}
                                byPlanTier={shares.eventsByPlanTier}
                            />
                        </div>

                        {/* Storage */}
                        <PlatformStorageGroup storage={metrics.storage} />

                        {/* Newsletter */}
                        {metrics.newsletter && <PlatformNewsletterGroup newsletter={metrics.newsletter} />}
                    </>
                )}
            </div>
        </div>
    );
}
