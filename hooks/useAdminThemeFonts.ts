'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { adminThemePresetKeys } from '@/hooks/useAdminThemePresets';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminThemeFontDto, AdminThemeFontPatchDto, AdminThemeFontRequestDto } from '@/lib/api/types';

// Admin theme font catalog (/api/admin/theme-fonts). Every write refetches the list, and the
// presets too: their rows and font picker carry font summaries.

export const adminThemeFontKeys = {
    all: ['admin', 'theme-fonts'] as const,
};

export function useAdminThemeFonts() {
    return useQuery({
        queryKey: adminThemeFontKeys.all,
        queryFn: () => api.get<AdminThemeFontDto[]>(endpoints.admin.themeFonts.list),
    });
}

function useRefreshThemeFonts() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
        void queryClient.invalidateQueries({ queryKey: adminThemePresetKeys.all });
    }, [queryClient]);
}

export function useCreateThemeFont() {
    const refresh = useRefreshThemeFonts();
    return useMutation({
        mutationFn: (input: AdminThemeFontRequestDto) => api.post<AdminThemeFontDto>(endpoints.admin.themeFonts.list, input),
        onSuccess: refresh,
    });
}

export function usePatchThemeFont() {
    const refresh = useRefreshThemeFonts();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminThemeFontPatchDto }) =>
            api.patch<AdminThemeFontDto>(endpoints.admin.themeFonts.byId(id), input),
        onSuccess: refresh,
    });
}

// POST …/{id}/file — replaces the file and bumps the version in `url`. FormData, so the browser sets
// the multipart boundary and the Content-Length the backend requires.
export function useUploadThemeFontFile() {
    const refresh = useRefreshThemeFonts();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<AdminThemeFontDto>(endpoints.admin.themeFonts.file(id), formData);
        },
        onSuccess: refresh,
    });
}
