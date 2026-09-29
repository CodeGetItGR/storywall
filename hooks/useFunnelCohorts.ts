'use client';

import { useMemo, useState } from 'react';

import { useAdminFunnelCohorts } from '@/hooks/useAdmin';
import { cohortChartRows, type FunnelCohortMode, type FunnelCohortWeeks } from '@/lib/adminFunnel';

// Weekly signup cohorts. Independent of the page's date range.
export function useFunnelCohorts() {
    const [weeks, setWeeks] = useState<FunnelCohortWeeks>(12);
    const [mode, setMode] = useState<FunnelCohortMode>('COUNT');
    const query = useAdminFunnelCohorts(weeks);

    const rows = useMemo(() => (query.data ? cohortChartRows(query.data, mode) : null), [mode, query.data]);

    return {
        weeks,
        setWeeks,
        mode,
        setMode,
        rows,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}
