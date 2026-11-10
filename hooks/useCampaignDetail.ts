'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo } from 'react';

import { useCampaignDetailQuery, useCampaignListQuery } from '@/hooks/useAdminCampaignApi';
import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { FunnelBounds } from '@/lib/adminFunnel';
import { ApiError } from '@/lib/api/client';
import type { CampaignDetailDto, CampaignListItemDto } from '@/lib/api/types';
import {
    campaignDailyRows,
    campaignFunnel,
    campaignPlatformRows,
    type CampaignTab,
    campaignTab,
    changeOf,
    rateMeasure,
    revenueChangeOf,
    verdictOf,
} from '@/lib/campaignCompare';
import { dateTimeFormat } from '@/lib/format';

// The page's numbers, worked out once per answer.
function detailView(data: CampaignDetailDto, id: string, items: readonly CampaignListItemDto[] | undefined) {
    const measure = rateMeasure(data.current);
    return {
        funnel: campaignFunnel(data.current, data.previous),
        platforms: campaignPlatformRows(data.links, measure),
        measure,
        // Null until the list loads.
        verdict: items
            ? verdictOf(
                  data.current,
                  items.filter((item) => item.campaign.id !== id).map((item) => item.current),
              )
            : null,
        salesChange: changeOf(data.current.sales, data.previous?.sales),
        revenueChange: revenueChangeOf(data.current.salesRevenueMinorByCurrency, data.previous?.salesRevenueMinorByCurrency),
        dailyRows: campaignDailyRows(data.daily, data.previousDaily),
    };
}

// One campaign's page: its funnel, platforms and days, and its verdict against the other campaigns in
// the same range. The list query is the list page's, so it is usually cached already.
export function useCampaignDetail(id: string, bounds: FunnelBounds, onNotFound: () => void) {
    const locale = useLocale();
    const format = useCampaignFormat();
    const { since, until, isValid } = bounds;
    const query = useCampaignDetailQuery(id, since, until, isValid);
    const list = useCampaignListQuery(since, until, isValid);
    const data = isValid ? query.data : undefined;
    const items = isValid ? list.data?.items : undefined;
    const notFound = query.error instanceof ApiError && query.error.status === 404;

    // A deleted campaign, or an old address: back to the list.
    useEffect(() => {
        if (notFound) onNotFound();
    }, [notFound, onNotFound]);

    const view = useMemo(() => (data ? detailView(data, id, items) : null), [data, id, items]);

    // The campaigns a link can move to.
    const others = useMemo(() => (items ?? []).map((item) => item.campaign).filter((campaign) => campaign.id !== id), [id, items]);

    const refetchDetail = query.refetch;
    const refetchList = list.refetch;
    const refresh = useCallback(() => {
        void refetchDetail();
        void refetchList();
    }, [refetchDetail, refetchList]);

    const tab: CampaignTab = data ? campaignTab(data.campaign) : 'current';

    return {
        data,
        view,
        others,
        tab,
        compared: data?.previousSince && data.previousUntil ? format.period(data.previousSince, data.previousUntil) : null,
        updatedAt: query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null,
        refresh,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: notFound ? null : query.error,
    };
}
