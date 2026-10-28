'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDeviceCreatedDto, AdminDeviceDto } from '@/lib/api/types';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

// The admin's paired phones (/api/admin/devices). Every write refetches the list. A phone's last-seen time
// changes without any write here, so the list also goes stale quickly.

export const adminDeviceKeys = {
    all: ['admin', 'devices'] as const,
};

export function useAdminDevices() {
    return useQuery({
        queryKey: adminDeviceKeys.all,
        queryFn: () => api.get<AdminDeviceDto[]>(endpoints.admin.devices.list),
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

export function useRefreshAdminDevices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    }, [queryClient]);
}

export function useCreateAdminDevice() {
    const refresh = useRefreshAdminDevices();
    return useMutation({
        mutationFn: (input: { name: string }) => api.post<AdminDeviceCreatedDto>(endpoints.admin.devices.list, input),
        onSuccess: refresh,
        // The result holds the one-time key. Without this React Query keeps it in the mutation cache for 5 minutes.
        gcTime: 0,
    });
}

export function useRevokeAdminDevice() {
    const refresh = useRefreshAdminDevices();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.devices.byId(id)),
        // Settled, not just success: a 404 for a phone already removed elsewhere should refresh the list too.
        onSettled: refresh,
    });
}
