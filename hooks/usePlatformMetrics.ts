'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useAdminMetrics } from '@/hooks/useAdmin';
import { toMetricShares } from '@/lib/adminUtils';
import { dateTimeFormat } from '@/lib/format';

export function usePlatformMetrics() {
    const locale = useLocale();
    const query = useAdminMetrics();
    const metrics = query.data;

    const shares = useMemo(
        () =>
            metrics && {
                usersByAccountPlan: toMetricShares(metrics.usersByAccountPlan),
                eventsByStatus: toMetricShares(metrics.eventsByStatus),
                eventsByPlanTier: toMetricShares(metrics.eventsByPlanTier),
            },
        [metrics],
    );

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const refresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    return {
        metrics,
        shares,
        updatedAt,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refresh,
    };
}
