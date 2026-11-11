import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
    AdminInvitationThemeDto,
    AdminInvitationThemeDuplicateDto,
    AdminInvitationThemeRequestDto,
    AdminInvitationThemeSummaryDto,
} from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// Save my date themes in the admin (/api/admin/invitation-themes). Every write refetches the list.
// No 'use client': the themes page's server prefetch reads adminInvitationThemeKeys.

export const adminInvitationThemeKeys = {
    all: ['admin', 'invitation-themes'] as const,
    list: () => [...adminInvitationThemeKeys.all, 'list'] as const,
    detail: (id: string) => [...adminInvitationThemeKeys.all, 'detail', id] as const,
    fonts: ['invitation-fonts', 'files'] as const,
};

export function useAdminInvitationThemes() {
    return useQuery({
        queryKey: adminInvitationThemeKeys.list(),
        queryFn: () => api.get<AdminInvitationThemeSummaryDto[]>(endpoints.admin.invitationThemes.list),
    });
}

// The whole theme. Its image URLs may be presigned and expire, so it is always loaded fresh.
export function useAdminInvitationTheme(id: string | null) {
    return useQuery({
        queryKey: adminInvitationThemeKeys.detail(id ?? ''),
        queryFn: () => api.get<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.byId(id ?? '')),
        enabled: Boolean(id),
        staleTime: 0,
        gcTime: 0,
    });
}

// The font catalogue the renderer needs for fonts uploaded in the admin.
export function useInvitationFonts(enabled: boolean) {
    return useQuery({
        queryKey: adminInvitationThemeKeys.fonts,
        queryFn: () => api.get<InvitationFontDto[]>('/api/invitation-fonts/files'),
        enabled,
        staleTime: 5 * 60_000,
    });
}

function useRefreshInvitationThemes() {
    const queryClient = useQueryClient();
    return useCallback(
        (saved: AdminInvitationThemeDto) => {
            queryClient.setQueryData(adminInvitationThemeKeys.detail(saved.id), saved);
            void queryClient.invalidateQueries({ queryKey: adminInvitationThemeKeys.list() });
        },
        [queryClient],
    );
}

export function useCreateInvitationTheme() {
    const refresh = useRefreshInvitationThemes();
    return useMutation({
        mutationFn: (input: AdminInvitationThemeRequestDto) => api.post<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.list, input),
        onSuccess: refresh,
    });
}

export function useUpdateInvitationTheme() {
    const refresh = useRefreshInvitationThemes();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminInvitationThemeRequestDto }) =>
            api.put<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.byId(id), input),
        onSuccess: refresh,
    });
}

// POST …/{id}/duplicate — a draft copy with its own copy of every image.
export function useDuplicateInvitationTheme() {
    const refresh = useRefreshInvitationThemes();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminInvitationThemeDuplicateDto }) =>
            api.post<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.duplicate(id), input),
        onSuccess: refresh,
    });
}
