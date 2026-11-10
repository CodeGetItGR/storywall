'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CampaignDetailDto, CampaignDto, CampaignLinkDto, CampaignLinksRequestDto, CampaignListDto, CampaignRequestDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// The Campaigns page's reads (/api/admin/campaigns). Keys sit under the old report's prefix, so a link
// write that refreshes ['admin', 'campaigns'] refreshes these too.
export const campaignKeys = {
    all: ['admin', 'campaigns'] as const,
    list: (since: string | null, until: string | null) => ['admin', 'campaigns', 'list', since, until] as const,
    detail: (id: string, since: string | null, until: string | null) => ['admin', 'campaigns', 'detail', id, since, until] as const,
    // One campaign's page, every range.
    details: (id: string) => ['admin', 'campaigns', 'detail', id] as const,
};

export function useCampaignListQuery(since: string | null, until: string | null, enabled: boolean) {
    return useQuery({
        queryKey: campaignKeys.list(since, until),
        queryFn: () => api.get<CampaignListDto>(endpoints.admin.campaigns.list(since, until)),
        placeholderData: keepPreviousData,
        enabled,
    });
}

// The previous range's numbers stay up while a new range loads, but only for the same campaign.
export function useCampaignDetailQuery(id: string, since: string | null, until: string | null, enabled: boolean) {
    return useQuery({
        queryKey: campaignKeys.detail(id, since, until),
        queryFn: () => api.get<CampaignDetailDto>(endpoints.admin.campaigns.detail(id, since, until)),
        placeholderData: (previous) => (previous?.campaign.id === id ? previous : undefined),
        enabled,
    });
}

// A write changes the list, a campaign's page and the old link report (all under ['admin', 'campaigns']),
// and through a discount the price banner and the public plans.
function useRefreshCampaigns() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        invalidatePublicConfig(queryClient);
        return Promise.all([
            queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
            queryClient.invalidateQueries({ queryKey: discountCampaignKeys.live() }),
        ]);
    }, [queryClient]);
}

export function useCreateCampaign() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (input: CampaignRequestDto) => api.post<CampaignDto>(endpoints.admin.campaigns.create, input),
        onSuccess: refresh,
    });
}

export function useUpdateCampaign() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: CampaignRequestDto }) => api.patch<CampaignDto>(endpoints.admin.campaigns.byId(id), input),
        onSuccess: refresh,
    });
}

// Archive, unarchive and stop refresh even when they fail: a refusal usually means the campaign changed
// since the page loaded.
export function useArchiveCampaign() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.post<CampaignDto>(endpoints.admin.campaigns.archive(id)),
        onSettled: refresh,
    });
}

export function useUnarchiveCampaign() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.post<CampaignDto>(endpoints.admin.campaigns.unarchive(id)),
        onSettled: refresh,
    });
}

export function useStopCampaignDiscount() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.post<CampaignDto>(endpoints.admin.campaigns.stop(id)),
        onSettled: refresh,
    });
}

// The deleted campaign's page is dropped first, so the refresh doesn't ask Spring for it again.
export function useDeleteCampaign() {
    const queryClient = useQueryClient();
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.campaigns.byId(id)),
        onSuccess: (_, id) => {
            queryClient.removeQueries({ queryKey: campaignKeys.details(id) });
            return refresh();
        },
    });
}

export function useAddCampaignLinks() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: CampaignLinksRequestDto }) =>
            api.post<CampaignLinkDto[]>(endpoints.admin.campaigns.links(id), input),
        onSuccess: refresh,
    });
}

export function useMoveCampaignLink() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: ({ id, campaignId }: { id: string; campaignId: string }) =>
            api.patch<CampaignLinkDto>(endpoints.admin.campaignLinks.byId(id), { campaignId }),
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
