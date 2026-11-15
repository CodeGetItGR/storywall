// No 'use client': the Save my date fonts page's server prefetch reads adminThemeFontKeys.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import { adminQrCardTemplateKeys } from '@/hooks/useAdminQrCardTemplates';
import { adminThemePresetKeys } from '@/hooks/useAdminThemePresets';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminThemeFontDto, AdminThemeFontPatchDto, AdminThemeFontRequestDto, ThemeFontLibrary } from '@/lib/api/types';

// Admin theme font catalog (/api/admin/theme-fonts). Two separate lists share it: the wall's (theme
// presets, QR cards) and Save my date's. Every write refetches both lists, the presets and QR card
// designs (their rows and font pickers carry font summaries) and the invitation font files.

export const adminThemeFontKeys = {
    all: ['admin', 'theme-fonts'] as const,
    list: (library: ThemeFontLibrary) => [...adminThemeFontKeys.all, library] as const,
};

export function useAdminThemeFonts(library: ThemeFontLibrary = 'WALL') {
    return useQuery({
        queryKey: adminThemeFontKeys.list(library),
        queryFn: () => api.get<AdminThemeFontDto[]>(endpoints.admin.themeFonts.listIn(library)),
    });
}

function useRefreshThemeFonts() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
        void queryClient.invalidateQueries({ queryKey: adminThemePresetKeys.all });
        void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
        void queryClient.invalidateQueries({ queryKey: adminInvitationThemeKeys.fonts });
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
