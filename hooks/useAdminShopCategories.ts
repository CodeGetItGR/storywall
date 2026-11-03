'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AdminShopCategoryCollectionsDto,
    AdminShopCategoryCreateDto,
    AdminShopCategoryDto,
    AdminShopCategoryPatchDto,
} from '@/lib/api/types';

// Admin shop categories (/api/admin/shop/categories). Every write refetches the list.

export const adminShopCategoryKeys = {
    all: ['admin', 'shop', 'categories'] as const,
};

export function useAdminShopCategories() {
    return useQuery({
        queryKey: adminShopCategoryKeys.all,
        queryFn: () => api.get<AdminShopCategoryDto[]>(endpoints.admin.shop.categories),
    });
}

function useRefreshShopCategories() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminShopCategoryKeys.all });
    }, [queryClient]);
}

export function useCreateShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: (input: AdminShopCategoryCreateDto) => api.post<AdminShopCategoryDto>(endpoints.admin.shop.categories, input),
        onSuccess: refresh,
    });
}

export function usePatchShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopCategoryPatchDto }) =>
            api.patch<AdminShopCategoryDto>(endpoints.admin.shop.category(id), input),
        onSuccess: refresh,
    });
}

export function useSetShopCategoryCollections() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopCategoryCollectionsDto }) =>
            api.put<AdminShopCategoryDto>(endpoints.admin.shop.categoryCollections(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.shop.category(id)),
        onSuccess: refresh,
    });
}
