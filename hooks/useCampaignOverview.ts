'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAdminCampaignOverview, useAdminCampaigns } from '@/hooks/useAdminCampaigns';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { campaignSourceGroups, campaignSourceOptions } from '@/lib/adminCampaignOverview';
import { dateTimeFormat } from '@/lib/format';

// The Campaign overview section: its own range and source, every saved link.
export function useCampaignOverview() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const [source, setSource] = useState<string | null>(null);
    const query = useAdminCampaignOverview(since, until, null, { enabled: isValid, source });
    // The same range per (source, medium, campaign), for the source list and the By source table.
    const report = useAdminCampaigns(since, until, { enabled: isValid });

    const allGroups = useMemo(() => (isValid && report.data ? campaignSourceGroups(report.data) : undefined), [isValid, report.data]);
    const sourceGroups = useMemo(() => (source ? allGroups?.filter((group) => group.source === source) : allGroups), [allGroups, source]);
    const sourceOptions = useMemo(() => campaignSourceOptions(allGroups ?? [], source), [allGroups, source]);

    const handleSourceChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setSource(event.target.value || null);
    }, []);

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const { refetch: refetchReport } = report;
    const refresh = useCallback(() => {
        void refetch();
        void refetchReport();
    }, [refetch, refetchReport]);

    return {
        range,
        source,
        sourceOptions,
        handleSourceChange,
        sourceGroups,
        data: isValid ? query.data : undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching || report.isFetching,
        error: query.error,
        updatedAt,
        refresh,
    };
}
