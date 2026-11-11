'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type SubmitEvent, useCallback, useEffect, useState } from 'react';

import { useSlugAvailability } from '@/hooks/useSlugAvailability';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { publishedInvitationPath } from '@/lib/invitation/inviteHost';
import {
    canPublishSlug,
    type InvitationPublicationDto,
    invitationPublicationKeys,
    readPublishFailure,
    type SlugCheck,
} from '@/lib/invitation/publication';
import { routes } from '@/lib/routes';

// How long a short note after publishing stays.
export const PUBLISH_NOTICE_MS = 4000;

// The line under the top bar after Publish.
export type PublishNotice =
    // First publish: stays, with a button that opens the page.
    | { kind: 'published'; path: string }
    | { kind: 'republished' }
    // The draft isn't on an event yet (KAN-83 adds that step).
    | { kind: 'unavailable' }
    | { kind: 'failed' };

// Why the plan dialog is open.
export type PlanPrompt = 'plan-missing' | 'coverage-ended';

type PublishInvitationOptions = {
    draftId: string;
    eventId: string | null;
    // Saves what is unsaved and says whether everything is saved.
    flush: () => Promise<boolean>;
    // The stored revision after that save.
    revision: () => number;
};

// The published copy of the draft, or null when it was never published.
async function fetchPublication(draftId: string): Promise<InvitationPublicationDto | null> {
    try {
        return await api.get<InvitationPublicationDto>(endpoints.invitationDrafts.publication(draftId));
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

// Publish: saves, then publishes again straight away, asks for the link the first time,
// or sends the host to the event's plan when it doesn't cover the invitation.
export function usePublishInvitation({ draftId, eventId, flush, revision }: PublishInvitationOptions) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [slugValue, setSlugValue] = useState('');
    // A link the publish itself turned down, which the check had let through.
    const [refused, setRefused] = useState<{ slug: string; check: SlugCheck } | null>(null);
    const [sheetFailed, setSheetFailed] = useState(false);
    const [notice, setNotice] = useState<PublishNotice | null>(null);
    const [planPrompt, setPlanPrompt] = useState<PlanPrompt | null>(null);
    const availability = useSlugAvailability(slugValue);
    const slugCheck = refused?.slug === availability.slug ? refused.check : availability.check;

    const mutation = useMutation({
        mutationFn: (slug: string | undefined) =>
            api.post<InvitationPublicationDto>(
                endpoints.invitationDrafts.publish(draftId),
                slug ? { revision: revision(), slug } : { revision: revision() },
            ),
    });
    const { mutateAsync } = mutation;

    useEffect(() => {
        if (!notice || notice.kind === 'published') return;
        const timer = setTimeout(() => setNotice(null), PUBLISH_NOTICE_MS);
        return () => clearTimeout(timer);
    }, [notice]);

    const send = useCallback(
        async (slug?: string) => {
            try {
                const publication = await mutateAsync(slug);
                queryClient.setQueryData(invitationPublicationKeys.detail(draftId), publication);
                setIsSheetOpen(false);
                setNotice(slug ? { kind: 'published', path: publishedInvitationPath(publication.slug) } : { kind: 'republished' });
            } catch (error) {
                const failure = readPublishFailure(error);
                if (failure === 'plan-missing' || failure === 'coverage-ended') {
                    setIsSheetOpen(false);
                    setPlanPrompt(failure);
                } else if (failure === 'no-event') {
                    setIsSheetOpen(false);
                    setNotice({ kind: 'unavailable' });
                } else if (slug && (failure === 'slug-taken' || failure === 'slug-not-allowed')) {
                    setRefused({ slug, check: failure === 'slug-taken' ? 'taken' : 'reserved' });
                } else if (slug) {
                    setSheetFailed(true);
                } else {
                    setNotice({ kind: 'failed' });
                }
            }
        },
        [draftId, mutateAsync, queryClient],
    );

    const start = useCallback(async () => {
        setNotice(null);
        setIsPreparing(true);
        try {
            if (!(await flush())) return;
            if (!eventId) {
                setNotice({ kind: 'unavailable' });
                return;
            }
            let publication: InvitationPublicationDto | null;
            try {
                publication = await queryClient.fetchQuery({
                    queryKey: invitationPublicationKeys.detail(draftId),
                    queryFn: () => fetchPublication(draftId),
                    staleTime: 0,
                });
            } catch {
                setNotice({ kind: 'failed' });
                return;
            }
            if (publication) {
                await send();
            } else {
                setSheetFailed(false);
                setIsSheetOpen(true);
            }
        } finally {
            setIsPreparing(false);
        }
    }, [draftId, eventId, flush, queryClient, send]);

    const submit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canPublishSlug(slugCheck) || mutation.isPending) return;
            setSheetFailed(false);
            void send(availability.slug);
        },
        [availability.slug, mutation.isPending, send, slugCheck],
    );

    const closeSheet = useCallback(() => setIsSheetOpen(false), []);
    const closePlanPrompt = useCallback(() => setPlanPrompt(null), []);
    const seePlan = useCallback(() => {
        setPlanPrompt(null);
        if (eventId) router.push(routes.events.manage(eventId, { tab: 'plan' }));
    }, [eventId, router]);
    const openPublished = useCallback(() => {
        if (notice?.kind === 'published') window.open(notice.path, '_blank', 'noopener');
    }, [notice]);

    return {
        start: () => void start(),
        isBusy: isPreparing || mutation.isPending,
        notice,
        openPublished,
        planPrompt,
        closePlanPrompt,
        seePlan,
        sheet: {
            open: isSheetOpen,
            close: closeSheet,
            value: slugValue,
            setValue: setSlugValue,
            check: slugCheck,
            canSubmit: canPublishSlug(slugCheck) && !mutation.isPending,
            isPublishing: mutation.isPending,
            failed: sheetFailed,
            submit,
        },
    };
}

export type PublishSheetState = ReturnType<typeof usePublishInvitation>['sheet'];
