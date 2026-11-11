'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventDetails } from '@/hooks/useEvent';
import { useInvitationDrafts } from '@/hooks/useInvitationDrafts';
import { useMyEvents } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { eventsForInvitation } from '@/lib/invitation/invitationEvent';

const NO_IDS: string[] = [];

type InvitationEventChoiceOptions = {
    draftId: string;
    eventType: string;
    // Only while the event step is open.
    enabled: boolean;
    // The draft is on the event now.
    onAttached: (eventId: string) => void;
};

// The host's events the invitation can go on, and putting it on one of them.
export function useInvitationEventChoice({ draftId, eventType, enabled, onAttached }: InvitationEventChoiceOptions) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const memberships = useMyEvents();
    const drafts = useInvitationDrafts({ enabled });
    const hostedIds = useMemo(
        () =>
            enabled
                ? (memberships.data ?? []).filter((member) => member.role === 'HOST' && !member.deletedAt).map((member) => member.eventId)
                : NO_IDS,
        [enabled, memberships.data],
    );
    const details = useEventDetails(hostedIds);

    const events = useMemo(() => {
        const loaded = details.flatMap((detail) => (detail.data ? [detail.data] : []));
        const eventsWithInvitation = new Set((drafts.data ?? []).flatMap((draft) => (draft.eventId && draft.id !== draftId ? [draft.eventId] : [])));
        return eventsForInvitation({ memberships: memberships.data ?? [], events: loaded, eventType, eventsWithInvitation });
    }, [details, draftId, drafts.data, eventType, memberships.data]);

    const isLoading = enabled && (memberships.isLoading || drafts.isLoading || details.some((detail) => detail.isLoading));

    const attach = useMutation({
        mutationFn: (eventId: string) => api.put<InvitationDraftDto>(endpoints.invitationDrafts.event(draftId), { eventId }),
        onSuccess: (attached) => {
            queryClient.setQueryData<InvitationDraftDto>(invitationDraftKeys.detail(draftId), (old) =>
                old ? { ...old, eventId: attached.eventId } : attached,
            );
            void queryClient.invalidateQueries({ queryKey: invitationDraftKeys.list() });
            if (attached.eventId) onAttached(attached.eventId);
        },
    });
    const { mutate, reset } = attach;

    const choose = useCallback((eventId: string) => mutate(eventId), [mutate]);

    return {
        events,
        isLoading,
        choose,
        choosingId: attach.isPending ? (attach.variables ?? null) : null,
        error: attach.error ? toErrorMessage(attach.error) : null,
        reset,
    };
}

export type InvitationEventChoice = ReturnType<typeof useInvitationEventChoice>;
