'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type EditableDraft, type InvitationDraftDto, invitationDraftKeys, readEditableDraft } from '@/lib/invitation/drafts';

export function invitationDraftQueryOptions(draftId: string) {
    return {
        queryKey: invitationDraftKeys.detail(draftId),
        queryFn: () => api.get<InvitationDraftDto>(endpoints.invitationDrafts.byId(draftId)),
    };
}

function editableOrNull(dto: InvitationDraftDto | undefined): EditableDraft | 'invalid' | null {
    if (!dto) return null;
    try {
        return readEditableDraft(dto);
    } catch {
        return 'invalid';
    }
}

// The draft the editor opens. loadId changes when reload() brings in the stored copy,
// so the editor can start over from it.
export function useInvitationDraft(draftId: string) {
    const queryClient = useQueryClient();
    const query = useQuery(invitationDraftQueryOptions(draftId));
    const editable = useMemo(() => editableOrNull(query.data), [query.data]);
    const [loadId, setLoadId] = useState(0);
    const [isReloading, setIsReloading] = useState(false);
    const { refetch } = query;

    const retry = useCallback(() => {
        void refetch();
    }, [refetch]);

    const reload = useCallback(async () => {
        setIsReloading(true);
        try {
            await queryClient.fetchQuery({ ...invitationDraftQueryOptions(draftId), staleTime: 0 });
            setLoadId((current) => current + 1);
        } catch {
            // The conflict stays open; the next try may get through.
        } finally {
            setIsReloading(false);
        }
    }, [draftId, queryClient]);

    return {
        draft: editable === 'invalid' ? null : editable,
        isError: editable === 'invalid' || (query.isError && !query.data),
        loadId,
        isReloading,
        retry,
        reload,
    };
}
