import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { AdminInvitationTextDto, AdminInvitationTextRequestDto } from '@/lib/adminInvitationTexts';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

// No 'use client': the texts page's server prefetch reads adminInvitationTextKeys.

export const adminInvitationTextKeys = {
    all: ['admin', 'invitation-texts'] as const,
    list: () => [...adminInvitationTextKeys.all, 'list'] as const,
};

export function useAdminInvitationTexts() {
    return useQuery({
        queryKey: adminInvitationTextKeys.list(),
        queryFn: () => api.get<AdminInvitationTextDto[]>(endpoints.admin.invitationTexts.list),
    });
}

function useRefreshInvitationTexts() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminInvitationTextKeys.all });
    }, [queryClient]);
}

export function useCreateInvitationText() {
    const refresh = useRefreshInvitationTexts();
    return useMutation({
        mutationFn: (input: AdminInvitationTextRequestDto) => api.post<AdminInvitationTextDto>(endpoints.admin.invitationTexts.list, input),
        onSuccess: refresh,
    });
}

export function usePatchInvitationText() {
    const refresh = useRefreshInvitationTexts();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminInvitationTextRequestDto }) =>
            api.patch<AdminInvitationTextDto>(endpoints.admin.invitationTexts.byId(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteInvitationText() {
    const refresh = useRefreshInvitationTexts();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.invitationTexts.byId(id)),
        onSuccess: refresh,
    });
}
