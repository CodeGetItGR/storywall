'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAdminCampaignOverview } from '@/hooks/useAdminCampaigns';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { dateTimeFormat } from '@/lib/format';

// The Campaign overview section: its own range, every saved link.
export function useCampaignOverview() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminCampaignOverview(since, until, null, { enabled: isValid });

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return {
        range,
        data: isValid ? query.data : undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        updatedAt,
        refresh,
    };
}
