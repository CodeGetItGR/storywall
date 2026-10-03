'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberRoleCatalogDto, MemberRoleCatalogPatchDto, MemberRoleCatalogRequestDto } from '@/lib/api/types';
import type { SortOrderUpdate } from '@/lib/memberRoles';

// Admin role catalog (member-roles-fe-integration.md §9). Every write also
// refreshes /api/config, which carries the catalog to plan cards and labels.

export const adminMemberRoleKeys = {
    all: ['admin', 'member-roles'] as const,
    list: (eventTypeKey: string) => ['admin', 'member-roles', eventTypeKey] as const,
};

export function useAdminMemberRoles(eventTypeKey: string | null) {
    return useQuery({
        enabled: Boolean(eventTypeKey),
        queryKey: adminMemberRoleKeys.list(eventTypeKey ?? ''),
        queryFn: () => api.get<MemberRoleCatalogDto[]>(endpoints.admin.memberRoles.list(eventTypeKey ?? '')),
    });
}

function useRefreshMemberRoles() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminMemberRoleKeys.all });
        invalidatePublicConfig(queryClient);
    }, [queryClient]);
}

export function useCreateMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: (input: MemberRoleCatalogRequestDto) => api.post<MemberRoleCatalogDto>(endpoints.admin.memberRoles.collection, input),
        onSuccess: refresh,
    });
}

export function usePatchMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: MemberRoleCatalogPatchDto }) =>
            api.patch<MemberRoleCatalogDto>(endpoints.admin.memberRoles.byId(id), input),
        onSuccess: refresh,
    });
}

export function useSetMemberRoleRetired() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: ({ id, retired }: { id: string; retired: boolean }) =>
            api.post<MemberRoleCatalogDto>(retired ? endpoints.admin.memberRoles.retire(id) : endpoints.admin.memberRoles.unretire(id)),
        onSuccess: refresh,
    });
}

// One move is two PATCHes (more after a renumber), sent in order. The list
// refetches either way, so a half-applied move shows as it really is.
export function useMoveMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: async (updates: SortOrderUpdate[]) => {
            for (const update of updates) {
                await api.patch<MemberRoleCatalogDto>(endpoints.admin.memberRoles.byId(update.id), { sortOrder: update.sortOrder });
            }
        },
        onSettled: refresh,
    });
}
