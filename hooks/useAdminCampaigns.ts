'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CampaignLinkDto, CampaignLinkRequestDto, CampaignOverviewDto, CampaignRowDto } from '@/lib/api/types';

// The admin Campaigns report (/api/admin/metrics/campaigns), its overview (/campaigns/overview) and its
// saved links (/api/admin/campaign-links). Every link write refetches both, since they list every saved
// link.

export const adminCampaignKeys = {
    all: ['admin', 'campaigns'] as const,
    report: (since: string | null, until: string | null) => ['admin', 'campaigns', 'report', since, until] as const,
    overview: (since: string | null, until: string | null, linkId: string | null, source: string | null = null) =>
        ['admin', 'campaigns', 'overview', since, until, linkId, source] as const,
};

export function useAdminCampaigns(since: string | null, until: string | null, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: adminCampaignKeys.report(since, until),
        queryFn: () => api.get<CampaignRowDto[]>(endpoints.admin.metrics.campaigns(since, until)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}

// Every saved link, one utm source, or one link with linkId.
export function useAdminCampaignOverview(
    since: string | null,
    until: string | null,
    linkId: string | null,
    options: { enabled?: boolean; source?: string | null } = {},
) {
    const source = options.source ?? null;
    return useQuery({
        queryKey: adminCampaignKeys.overview(since, until, linkId, source),
        queryFn: () => api.get<CampaignOverviewDto>(endpoints.admin.metrics.campaignOverview(since, until, linkId, source)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}

function useRefreshCampaigns() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminCampaignKeys.all });
    }, [queryClient]);
}

export function useCreateCampaignLink() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (input: CampaignLinkRequestDto) => api.post<CampaignLinkDto>(endpoints.admin.campaignLinks.list, input),
        onSuccess: refresh,
    });
}

export function useRenameCampaignLink() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => api.patch<CampaignLinkDto>(endpoints.admin.campaignLinks.byId(id), { name }),
        onSuccess: refresh,
    });
}

export function useDeleteCampaignLink() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.campaignLinks.byId(id)),
        onSuccess: refresh,
    });
}
