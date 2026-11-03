'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminShopCollectionDto, AdminShopStoreCreateDto, AdminShopStoreDto, AdminShopStorePatchDto } from '@/lib/api/types';

// Admin Shopify stores (/api/admin/shop/stores). Every write refetches the list.

export const adminShopStoreKeys = {
    all: ['admin', 'shop', 'stores'] as const,
    collections: (id: string) => ['admin', 'shop', 'stores', id, 'collections'] as const,
};

export function useAdminShopStores() {
    return useQuery({
        queryKey: adminShopStoreKeys.all,
        queryFn: () => api.get<AdminShopStoreDto[]>(endpoints.admin.shop.stores),
    });
}

// Live from Shopify, so only for the store whose collections the admin is picking from.
export function useShopStoreCollections(storeId: string | null) {
    return useQuery({
        queryKey: adminShopStoreKeys.collections(storeId ?? ''),
        queryFn: () => api.get<AdminShopCollectionDto[]>(endpoints.admin.shop.storeCollections(storeId ?? '')),
        enabled: storeId !== null,
        staleTime: 60_000,
    });
}

function useRefreshShopStores() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminShopStoreKeys.all });
    }, [queryClient]);
}

export function useCreateShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (input: AdminShopStoreCreateDto) => api.post<AdminShopStoreDto>(endpoints.admin.shop.stores, input),
        onSuccess: refresh,
    });
}

export function usePatchShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopStorePatchDto }) => api.patch<AdminShopStoreDto>(endpoints.admin.shop.store(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.shop.store(id)),
        onSuccess: refresh,
    });
}

export function useSyncShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (id: string) => api.post<void>(endpoints.admin.shop.storeSync(id)),
        onSuccess: refresh,
    });
}
