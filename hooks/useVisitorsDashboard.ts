'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect } from 'react';

import { useAdminVisitors, useRefreshAdminVisitors } from '@/hooks/useAdmin';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { dateTimeFormat } from '@/lib/format';

export function useVisitorsDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminVisitors(since, until, { enabled: isValid });
    const refreshMutation = useRefreshAdminVisitors();

    const data = isValid ? query.data : undefined;
    // When Spring asked GA, not when this page fetched: a cached answer can be up to an hour old.
    const updatedAt = data?.updatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt)) : null;

    const { mutate, reset } = refreshMutation;
    // A failed refresh belongs to the range it ran for.
    useEffect(() => reset(), [reset, since, until]);
    const refresh = useCallback(() => {
        if (isValid) mutate({ since, until });
    }, [isValid, mutate, since, until]);

    return {
        range,
        data,
        isLoading: query.isLoading,
        isFetching: query.isFetching || refreshMutation.isPending,
        error: query.error ?? refreshMutation.error,
        updatedAt,
        refresh,
    };
}
