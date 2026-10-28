'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDeviceCreatedDto, AdminDeviceDto } from '@/lib/api/types';

// The admin's paired phones (/api/admin/devices). Every write refetches the list.

export const adminDeviceKeys = {
    all: ['admin', 'devices'] as const,
};

export function useAdminDevices() {
    return useQuery({
        queryKey: adminDeviceKeys.all,
        queryFn: () => api.get<AdminDeviceDto[]>(endpoints.admin.devices.list),
    });
}

function useRefreshDevices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    }, [queryClient]);
}

export function useCreateAdminDevice() {
    const refresh = useRefreshDevices();
    return useMutation({
        mutationFn: (input: { name: string }) => api.post<AdminDeviceCreatedDto>(endpoints.admin.devices.list, input),
        onSuccess: refresh,
    });
}

export function useRevokeAdminDevice() {
    const refresh = useRefreshDevices();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.devices.byId(id)),
        onSuccess: refresh,
    });
}
