'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useAdminModuleUsage } from '@/hooks/useAdmin';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { useModuleUsageFilters } from '@/hooks/useModuleUsageFilters';
import { moduleUsageRows } from '@/lib/adminModuleUsage';
import { dateTimeFormat } from '@/lib/format';

export function useModuleUsageDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const filters = useModuleUsageFilters();
    const { since, until, isValid } = range.bounds;
    const query = useAdminModuleUsage({ since, until, eventTypeKey: filters.eventTypeKey, planCode: filters.planCode }, { enabled: isValid });

    const usage = isValid ? query.data : undefined;
    const rows = useMemo(() => (usage ? moduleUsageRows(locale, usage) : undefined), [locale, usage]);
    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return {
        range,
        filters,
        // undefined while loading, null when too few events match, otherwise the table rows.
        rows,
        minEvents: usage?.minEvents ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        updatedAt,
        refresh,
    };
}
