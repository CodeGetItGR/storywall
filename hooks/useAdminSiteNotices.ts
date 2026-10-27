'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminSiteNoticeDto, AdminSiteNoticeRequestDto } from '@/lib/api/types';

// Admin site notices (/api/admin/site-notices). Every write refetches the list and the live notices.
// The live list is cached for a minute on the server, so a change reaches the bar, the admin's own
// included, within about a minute.

export const adminSiteNoticeKeys = {
    all: ['admin', 'site-notices'] as const,
};

export function useAdminSiteNotices() {
    return useQuery({
        queryKey: adminSiteNoticeKeys.all,
        queryFn: () => api.get<AdminSiteNoticeDto[]>(endpoints.admin.siteNotices.list),
    });
}

function useRefreshSiteNotices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminSiteNoticeKeys.all });
        void queryClient.invalidateQueries({ queryKey: siteNoticeKeys.live() });
    }, [queryClient]);
}

export function useCreateSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: (input: AdminSiteNoticeRequestDto) => api.post<AdminSiteNoticeDto>(endpoints.admin.siteNotices.list, input),
        onSuccess: refresh,
    });
}

export function useUpdateSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminSiteNoticeRequestDto }) =>
            api.put<AdminSiteNoticeDto>(endpoints.admin.siteNotices.byId(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.siteNotices.byId(id)),
        onSuccess: refresh,
    });
}
