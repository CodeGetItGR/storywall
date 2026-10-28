'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminQrCardTemplateDto, AdminQrCardTemplatePatchDto, AdminQrCardTemplateRequestDto } from '@/lib/api/types';

// Admin QR card template catalog (/api/admin/qr-card-templates). Every write refetches the list.

const templateIdOf = (template: AdminQrCardTemplateDto) => template.id;

export const adminQrCardTemplateKeys = {
    all: ['admin', 'qr-card-templates'] as const,
};

export function useAdminQrCardTemplates() {
    return useQuery({
        queryKey: adminQrCardTemplateKeys.all,
        queryFn: () => api.get<AdminQrCardTemplateDto[]>(endpoints.admin.qrCardTemplates.list),
    });
}

function useRefreshQrCardTemplates() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
    }, [queryClient]);
}

export function useCreateQrCardTemplate() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: (input: AdminQrCardTemplateRequestDto) => api.post<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.list, input),
        onSuccess: refresh,
    });
}

export function usePatchQrCardTemplate() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminQrCardTemplatePatchDto }) =>
            api.patch<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.byId(id), input),
        onSuccess: refresh,
    });
}

// POST …/{id}/artwork — replaces any previous artwork.
export function useUploadQrCardArtwork() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.artwork(id), formData);
        },
        onSuccess: refresh,
    });
}

export function useMoveQrCardTemplate(templates: AdminQrCardTemplateDto[]) {
    return useSortOrderMove({
        items: templates,
        idOf: templateIdOf,
        patch: ({ id, sortOrder }) => api.patch<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.byId(id), { sortOrder }),
        refresh: useRefreshQrCardTemplates(),
    });
}
