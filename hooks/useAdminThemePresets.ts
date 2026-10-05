'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminThemePresetDto, AdminThemePresetPatchDto, AdminThemePresetRequestDto } from '@/lib/api/types';

// Admin theme preset catalog (/api/admin/theme-presets). Every write refetches the list.

const presetIdOf = (preset: AdminThemePresetDto) => preset.id;

export const adminThemePresetKeys = {
    all: ['admin', 'theme-presets'] as const,
};

export function useAdminThemePresets() {
    return useQuery({
        queryKey: adminThemePresetKeys.all,
        queryFn: () => api.get<AdminThemePresetDto[]>(endpoints.admin.themePresets.list),
    });
}

function useRefreshThemePresets() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminThemePresetKeys.all });
    }, [queryClient]);
}

export function useCreateThemePreset() {
    const refresh = useRefreshThemePresets();
    return useMutation({
        mutationFn: (input: AdminThemePresetRequestDto) => api.post<AdminThemePresetDto>(endpoints.admin.themePresets.list, input),
        onSuccess: refresh,
    });
}

export function usePatchThemePreset() {
    const refresh = useRefreshThemePresets();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminThemePresetPatchDto }) =>
            api.patch<AdminThemePresetDto>(endpoints.admin.themePresets.byId(id), input),
        onSuccess: refresh,
    });
}

// POST …/{id}/illustration — replaces any previous illustration.
export function useUploadThemePresetIllustration() {
    const refresh = useRefreshThemePresets();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<AdminThemePresetDto>(endpoints.admin.themePresets.illustration(id), formData);
        },
        onSuccess: refresh,
    });
}

export function useMoveThemePreset(presets: AdminThemePresetDto[]) {
    return useSortOrderMove({
        items: presets,
        idOf: presetIdOf,
        patch: ({ id, sortOrder }) => api.patch<AdminThemePresetDto>(endpoints.admin.themePresets.byId(id), { sortOrder }),
        refresh: useRefreshThemePresets(),
    });
}
