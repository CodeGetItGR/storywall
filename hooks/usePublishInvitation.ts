'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type SubmitEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSlugAvailability } from '@/hooks/useSlugAvailability';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { publishedInvitationPath } from '@/lib/invitation/inviteHost';
import {
    canPublishSlug,
    fetchPublication,
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
    { kind: 'published'; path: string } | { kind: 'republished' } | { kind: 'failed' };

// Why the plan dialog is open.
export type PlanPrompt = 'plan-missing' | 'coverage-ended';

type PublishInvitationOptions = {
    draftId: string;
    eventId: string | null;
    // Saves what is unsaved and says whether everything is saved.
    flush: () => Promise<boolean>;
    // The stored revision after that save.
    revision: () => number;
    // Makes a draft started signed out the account's; false when that failed.
    claim: () => Promise<boolean>;
};

// Publish: saves, then publishes again straight away, asks for the link the first time,
// or sends the host to the event's plan when it doesn't cover the invitation. Before that a
// visitor signs in, and a draft on no event goes on one (the event step).
export function usePublishInvitation({ draftId, eventId: openedEventId, flush, revision, claim }: PublishInvitationOptions) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    // The event the draft is on; the event step puts it on one.
    const [eventId, setEventId] = useState(openedEventId);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isEventStepOpen, setIsEventStepOpen] = useState(false);
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
                    setIsEventStepOpen(true);
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

    // The draft is on an event: publishes again, or asks for the link the first time.
    const publishOnEvent = useCallback(async () => {
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
    }, [draftId, queryClient, send]);

    const prepare = useCallback(async (step: () => Promise<void>) => {
        setNotice(null);
        setIsPreparing(true);
        try {
            await step();
        } finally {
            setIsPreparing(false);
        }
    }, []);

    const start = useCallback(
        () =>
            prepare(async () => {
                if (!(await flush())) return;
                if (!isAuthenticated) {
                    setIsSignInOpen(true);
                    return;
                }
                if (!(await claim())) {
                    setNotice({ kind: 'failed' });
                    return;
                }
                if (!eventId) {
                    setIsEventStepOpen(true);
                    return;
                }
                await publishOnEvent();
            }),
        [claim, eventId, flush, isAuthenticated, prepare, publishOnEvent],
    );

    // The event step put the draft on an event: publishing goes on from there.
    const onAttached = useCallback(
        (attachedEventId: string) => {
            setEventId(attachedEventId);
            setIsEventStepOpen(false);
            void prepare(publishOnEvent);
        },
        [prepare, publishOnEvent],
    );

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
    const closeSignIn = useCallback(() => setIsSignInOpen(false), []);
    const closeEventStep = useCallback(() => setIsEventStepOpen(false), []);
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
        signIn: {
            open: isSignInOpen,
            close: closeSignIn,
            // Back in the editor after signing in, publishing goes on.
            loginHref: routes.auth.login({ next: routes.saveMyDateEditorPublish(draftId) }),
            registerHref: routes.auth.register({ next: routes.saveMyDateEditorPublish(draftId) }),
        },
        eventStep: { open: isEventStepOpen, close: closeEventStep, onAttached },
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
export type PublishSignInState = ReturnType<typeof usePublishInvitation>['signIn'];
export type PublishEventStepState = ReturnType<typeof usePublishInvitation>['eventStep'];
