'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDiscountCampaignDto, DiscountCampaignRequestDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// Admin discount campaigns (/api/admin/discount-campaigns). Every write refetches the list, the live
// campaign and the public plans. The live campaign is cached for a minute on the server, so a change
// reaches the bar within about a minute.

export const adminDiscountCampaignKeys = {
    all: ['admin', 'discount-campaigns'] as const,
};

export function useAdminDiscountCampaigns() {
    return useQuery({
        queryKey: adminDiscountCampaignKeys.all,
        queryFn: () => api.get<AdminDiscountCampaignDto[]>(endpoints.admin.discountCampaigns.list),
    });
}

function useRefreshDiscountCampaigns() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminDiscountCampaignKeys.all });
        void queryClient.invalidateQueries({ queryKey: discountCampaignKeys.live() });
        invalidatePublicConfig(queryClient);
    }, [queryClient]);
}

export function useCreateDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (input: DiscountCampaignRequestDto) => api.post<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.list, input),
        onSuccess: refresh,
    });
}

export function useUpdateDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: DiscountCampaignRequestDto }) =>
            api.put<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.byId(id), input),
        onSuccess: refresh,
    });
}

export function useStopDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.post<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.stop(id), {}),
        // A failure usually means the campaign changed meanwhile, so the list is refreshed either way.
        onSettled: refresh,
    });
}

export function useDeleteDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.discountCampaigns.byId(id)),
        onSettled: refresh,
    });
}
