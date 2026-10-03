'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAdminFunnel } from '@/hooks/useAdmin';
import { useFunnelCohorts } from '@/hooks/useFunnelCohorts';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { dateTimeFormat } from '@/lib/format';

export function useFunnelDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminFunnel(since, until, { enabled: isValid });
    const cohorts = useFunnelCohorts();

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const { refetch: refetchCohorts } = cohorts;
    const refresh = useCallback(() => {
        void refetch();
        void refetchCohorts();
    }, [refetch, refetchCohorts]);

    return {
        range,
        metrics: isValid ? query.data : undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching || cohorts.isFetching,
        error: query.error,
        updatedAt,
        refresh,
        cohorts,
    };
}
