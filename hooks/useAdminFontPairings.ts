import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { AdminFontPairingDto, AdminFontPairingRequestDto } from '@/lib/adminFontPairings';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

// No 'use client': the font pairings page's server prefetch reads adminFontPairingKeys.

export const adminFontPairingKeys = {
    all: ['admin', 'invitation-font-pairings'] as const,
    list: () => [...adminFontPairingKeys.all, 'list'] as const,
};

export function useAdminFontPairings() {
    return useQuery({
        queryKey: adminFontPairingKeys.list(),
        queryFn: () => api.get<AdminFontPairingDto[]>(endpoints.admin.invitationFontPairings.list),
    });
}

function useRefreshFontPairings() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminFontPairingKeys.all });
    }, [queryClient]);
}

export function useCreateFontPairing() {
    const refresh = useRefreshFontPairings();
    return useMutation({
        mutationFn: (input: AdminFontPairingRequestDto) => api.post<AdminFontPairingDto>(endpoints.admin.invitationFontPairings.list, input),
        onSuccess: refresh,
    });
}

export function usePatchFontPairing() {
    const refresh = useRefreshFontPairings();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminFontPairingRequestDto }) =>
            api.patch<AdminFontPairingDto>(endpoints.admin.invitationFontPairings.byId(id), input),
        onSuccess: refresh,
    });
}
