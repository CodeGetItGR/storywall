'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AdminLandingCategoryCreateDto,
    AdminLandingCategoryDto,
    AdminLandingCategoryEventTypesDto,
    AdminLandingCategoryPatchDto,
} from '@/lib/api/types';

// Admin landing categories (/api/admin/landing-categories). Every write refetches the list, the
// event types (their rows show the category) and the public config (the landing's tabs).

export const adminLandingCategoryKeys = {
    all: ['admin', 'landing-categories'] as const,
};

export function useAdminLandingCategories() {
    return useQuery({
        queryKey: adminLandingCategoryKeys.all,
        queryFn: () => api.get<AdminLandingCategoryDto[]>(endpoints.admin.landingCategories.list),
    });
}

function useRefreshLandingCategories() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminLandingCategoryKeys.all });
        void queryClient.invalidateQueries({ queryKey: adminKeys.platformEventTypes });
        invalidatePublicConfig(queryClient);
    }, [queryClient]);
}

export function useCreateLandingCategory() {
    const refresh = useRefreshLandingCategories();
    return useMutation({
        mutationFn: (input: AdminLandingCategoryCreateDto) => api.post<AdminLandingCategoryDto>(endpoints.admin.landingCategories.list, input),
        onSuccess: refresh,
    });
}

export function usePatchLandingCategory() {
    const refresh = useRefreshLandingCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminLandingCategoryPatchDto }) =>
            api.patch<AdminLandingCategoryDto>(endpoints.admin.landingCategories.byId(id), input),
        onSuccess: refresh,
    });
}

export function useSetLandingCategoryEventTypes() {
    const refresh = useRefreshLandingCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminLandingCategoryEventTypesDto }) =>
            api.put<AdminLandingCategoryDto>(endpoints.admin.landingCategories.eventTypes(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteLandingCategory() {
    const refresh = useRefreshLandingCategories();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.landingCategories.byId(id)),
        onSuccess: refresh,
    });
}

function categoryId(category: AdminLandingCategoryDto): string {
    return category.id;
}

export function useLandingCategoryMove(items: AdminLandingCategoryDto[]) {
    return useSortOrderMove({
        items,
        idOf: categoryId,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.landingCategories.byId(id), { sortOrder }),
        refresh: useRefreshLandingCategories(),
    });
}
