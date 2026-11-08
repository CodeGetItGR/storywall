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

type InvitationDraftOptions = {
    // The server loaded the draft for this page, so the cached copy is the stored one.
    prefetched?: boolean;
};

// The draft the editor opens. loadId changes when reload() brings in the stored copy,
// so the editor can start over from it.
export function useInvitationDraft(draftId: string, { prefetched = false }: InvitationDraftOptions = {}) {
    const queryClient = useQueryClient();
    // A copy cached on an earlier visit may be older than the stored one (edited on another
    // device since), so the editor reads the draft again and waits for it.
    const query = useQuery({ ...invitationDraftQueryOptions(draftId), refetchOnMount: prefetched ? true : 'always' });
    const editable = useMemo(() => editableOrNull(query.data), [query.data]);
    // Once open, the editor stays open: a later read that fails doesn't take it away.
    const [isCurrent, setIsCurrent] = useState(prefetched);
    if (!isCurrent && query.isFetchedAfterMount && query.isSuccess) setIsCurrent(true);
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
        draft: isCurrent && editable !== 'invalid' ? editable : null,
        isError: (isCurrent && editable === 'invalid') || (!isCurrent && query.isError),
        loadId,
        isReloading,
        retry,
        reload,
    };
}
