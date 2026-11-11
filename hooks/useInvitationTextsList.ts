'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { adminInvitationTextKeys, useAdminInvitationTexts } from '@/hooks/useAdminInvitationTexts';
import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { type AdminInvitationTextDto, groupInvitationTexts } from '@/lib/adminInvitationTexts';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const textIdOf = (text: AdminInvitationTextDto) => text.id;

// The texts list, in groups of one event type and language: the order the editor offers is kept per group.
export function useInvitationTextsList() {
    const textsQuery = useAdminInvitationTexts();
    const texts = useMemo(() => textsQuery.data ?? [], [textsQuery.data]);
    const groups = useMemo(() => groupInvitationTexts(texts), [texts]);

    return { texts, groups, isLoaded: textsQuery.data !== undefined, isLoading: textsQuery.isLoading, error: textsQuery.error ?? null };
}

// The arrows and drag and drop of one group's texts: one sort order PATCH per moved text.
export function useInvitationTextGroupMove(texts: AdminInvitationTextDto[]) {
    const queryClient = useQueryClient();
    const move = useSortOrderMove({
        items: texts,
        idOf: textIdOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.invitationTexts.byId(id), { sortOrder }),
        refresh: () => void queryClient.invalidateQueries({ queryKey: adminInvitationTextKeys.all }),
    });

    const arranged = move.arrange(texts);

    return {
        texts: arranged,
        ids: arranged.map(textIdOf),
        canReorder: !move.isPending,
        moveError: move.error,
        moveText: move.move,
        reorderText: move.reorder,
    };
}
