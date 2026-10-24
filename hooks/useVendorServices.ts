'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorServiceItemDto, VendorServiceItemRequestDto } from '@/lib/api/types';

export const vendorServiceKeys = {
    mine: ['me', 'vendor-profile', 'services'] as const,
};

// Prices show in every event's print context and on open print lists (prices are live), so a change refreshes all of them.
function refresh(queryClient: QueryClient) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorServiceKeys.mine }),
        queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === 'events' && (query.queryKey[2] === 'print-picks' || query.queryKey[2] === 'print-lists'),
        }),
    ]);
}

// The caller's priced services. Reading needs no partner check; saving does (403 PARTNER_REQUIRED otherwise).
export function useVendorServices(enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: vendorServiceKeys.mine,
        queryFn: () => api.get<VendorServiceItemDto[]>(endpoints.me.vendorServices),
        enabled: enabled && isAuthenticated,
    });
}

export function useCreateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: VendorServiceItemRequestDto) => api.post<VendorServiceItemDto>(endpoints.me.vendorServices, body),
        onSuccess: () => refresh(queryClient),
    });
}

export function useUpdateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: VendorServiceItemRequestDto }) => api.put<VendorServiceItemDto>(endpoints.me.vendorService(id), body),
        onSuccess: () => refresh(queryClient),
    });
}

export function useDeleteVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.me.vendorService(id)),
        onSuccess: () => refresh(queryClient),
    });
}
