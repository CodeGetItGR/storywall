'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CampaignDetailDto, CampaignListDto } from '@/lib/api/types';

// The Campaigns page's reads (/api/admin/campaigns). Keys sit under the old report's prefix, so a link
// write that refreshes ['admin', 'campaigns'] refreshes these too.
export const campaignKeys = {
    all: ['admin', 'campaigns'] as const,
    list: (since: string | null, until: string | null) => ['admin', 'campaigns', 'list', since, until] as const,
    detail: (id: string, since: string | null, until: string | null) => ['admin', 'campaigns', 'detail', id, since, until] as const,
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
