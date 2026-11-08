'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { routes } from '@/lib/routes';

// Starts a draft from a theme once, then moves to its editor. The new draft goes
// straight into the cache, so the editor doesn't load it again.
export function useStartInvitationDraft(themeSlug: string) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { mutate, isError } = useMutation({
        mutationFn: () => api.post<InvitationDraftDto>(endpoints.invitationDrafts.root, { themeSlug }),
        onSuccess: (draft) => {
            queryClient.setQueryData(invitationDraftKeys.detail(draft.id), draft);
            router.replace(routes.saveMyDateEditor(draft.id));
        },
    });
    // Kept across React's development remount, so one visit starts one draft.
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        mutate();
    }, [mutate]);

    const retry = useCallback(() => mutate(), [mutate]);

    return { isError, retry };
}
