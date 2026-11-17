'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useCampaignListQuery } from '@/hooks/useAdminCampaignApi';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { FunnelBounds } from '@/lib/adminFunnel';
import { campaignListRows, type CampaignTab } from '@/lib/campaignCompare';
import { dateTimeFormat } from '@/lib/format';

// The list page's data: every campaign added up, and the tab's rows with their verdicts.
export function useCampaignList(bounds: FunnelBounds, tab: CampaignTab) {
    const locale = useLocale();
    const format = useCampaignFormat();
    const { since, until, isValid } = bounds;
    const query = useCampaignListQuery(since, until, isValid);
    const data = isValid ? query.data : undefined;

    const rows = useMemo(() => (data ? campaignListRows(data.items, tab) : []), [data, tab]);
    const compared = data?.previousSince && data.previousUntil ? format.period(data.previousSince, data.previousUntil) : null;
    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return {
        data,
        rows,
        compared,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        updatedAt,
        refresh,
    };
}
