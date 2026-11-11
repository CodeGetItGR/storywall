'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { saveDraftToken } from '@/lib/invitation/draftTokens';
import { takeStartIntent } from '@/lib/invitation/startIntent';
import { routes } from '@/lib/routes';

// A host who chose the theme from an event's Manage page gets the draft on that event, when the
// theme is for its type. Best effort: otherwise the event is picked when publishing.
async function attachToChosenEvent(draft: InvitationDraftDto): Promise<InvitationDraftDto> {
    const intent = takeStartIntent();
    if (!intent || draft.token || draft.eventId || intent.eventType !== draft.eventType) return draft;
    try {
        return await api.put<InvitationDraftDto>(endpoints.invitationDrafts.event(draft.id), { eventId: intent.eventId });
    } catch {
        return draft;
    }
}

// Starts a draft from a theme once, then moves to its editor. The new draft goes
// straight into the cache, so the editor doesn't load it again. A visitor who is
// signed out gets a draft of their own, opened with the token kept in this browser.
export function useStartInvitationDraft(themeSlug: string) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isBootstrapping } = useAuth();
    const { mutate, isError } = useMutation({
        mutationFn: async () => {
            const draft = await api.post<InvitationDraftDto>(endpoints.invitationDrafts.root, { themeSlug });
            if (draft.token) saveDraftToken(draft.id, draft.token, draft.expiresAt);
            return attachToChosenEvent(draft);
        },
        onSuccess: (draft) => {
            queryClient.setQueryData(invitationDraftKeys.detail(draft.id), draft);
            router.replace(routes.saveMyDateEditor(draft.id));
        },
    });
    // Kept across React's development remount, so one visit starts one draft.
    const started = useRef(false);

    // Waits for the session, so a signed-in host never starts a draft as a visitor.
    useEffect(() => {
        if (started.current || isBootstrapping) return;
        started.current = true;
        mutate();
    }, [isBootstrapping, mutate]);

    const retry = useCallback(() => mutate(), [mutate]);

    return { isError, retry };
}
