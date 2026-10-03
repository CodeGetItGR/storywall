'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BlockedTermDto, BlockedTermRequestDto } from '@/lib/api/types';

export const blockedTermKeys = { list: ['admin', 'blocked-terms'] as const };

export function useBlockedTerms() {
    return useQuery({ queryKey: blockedTermKeys.list, queryFn: () => api.get<BlockedTermDto[]>(endpoints.admin.blockedTerms.collection) });
}

export function useAddBlockedTerm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: BlockedTermRequestDto) => api.post<BlockedTermDto>(endpoints.admin.blockedTerms.collection, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTermKeys.list }),
    });
}

export function useDeleteBlockedTerm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.blockedTerms.byId(id)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTermKeys.list }),
    });
}
