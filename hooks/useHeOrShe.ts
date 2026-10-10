'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    HeOrSheAnswersRequestDto,
    HeOrSheResultsDto,
    HeOrSheSettingsRequestDto,
    HeOrSheValue,
    HeOrSheViewDto,
    QuizQuestionDto,
    QuizQuestionPatchDto,
    QuizQuestionRequestDto,
} from '@/lib/api/types';
import { msUntilReveal } from '@/lib/heOrShe';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

export const HE_OR_SHE_MODULE = 'he_or_she';

export const heOrSheKeys = {
    view: (eventId: string) => ['events', eventId, 'he-or-she'] as const,
    results: (eventId: string) => ['events', eventId, 'he-or-she', 'results'] as const,
};

// setTimeout overflows past ~24.8 days; a reveal further out is refetched on the next visit anyway.
const MAX_TIMER_MS = 2_147_483_647;

/**
 * The role-aware view. "Revealed" is computed on read, so while the page is open a timer refetches
 * the moment the scheduled reveal passes.
 */
export function useHeOrShe(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, HE_OR_SHE_MODULE);
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: heOrSheKeys.view(eventId ?? ''),
        queryFn: () => api.get<HeOrSheViewDto>(endpoints.events.heOrShe(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && readable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });

    const status = query.data?.status;
    const revealAt = query.data?.revealAt ?? null;
    useEffect(() => {
        if (!eventId || status !== 'OPEN') return;
        const wait = msUntilReveal(revealAt);
        if (wait === null || wait > MAX_TIMER_MS) return;
        // A second's slack, so the server's clock has passed revealAt too.
        const timer = setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: heOrSheKeys.view(eventId) });
        }, wait + 1000);
        return () => clearTimeout(timer);
    }, [eventId, queryClient, revealAt, status]);

    return query;
}

/** Every answer by name. Hosts only. */
export function useHeOrSheResults(eventId: string | null, isHost: boolean) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, HE_OR_SHE_MODULE);
    return useQuery({
        queryKey: heOrSheKeys.results(eventId ?? ''),
        queryFn: () => api.get<HeOrSheResultsDto>(endpoints.events.heOrSheResults(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && readable && isHost,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

/** The writes that answer with the whole view put it straight into the cache. */
function useViewMutation<TInput>(eventId: string, send: (input: TInput) => Promise<HeOrSheViewDto>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: send,
        onSuccess: (view) => {
            queryClient.setQueryData(heOrSheKeys.view(eventId), view);
            void queryClient.invalidateQueries({ queryKey: heOrSheKeys.results(eventId) });
        },
    });
}

export function useSendHeOrSheAnswers(eventId: string) {
    return useViewMutation(eventId, (input: HeOrSheAnswersRequestDto) => api.put<HeOrSheViewDto>(endpoints.events.heOrSheAnswers(eventId), input));
}

export function useUpdateHeOrSheSettings(eventId: string) {
    return useViewMutation(eventId, (input: HeOrSheSettingsRequestDto) => api.put<HeOrSheViewDto>(endpoints.events.heOrSheSettings(eventId), input));
}

export function useRevealHeOrShe(eventId: string) {
    return useViewMutation(eventId, (answer: HeOrSheValue | null) =>
        api.post<HeOrSheViewDto>(endpoints.events.heOrSheReveal(eventId), answer ? { answer } : {}),
    );
}

/** Question writes don't return the view: refetch it and the results. */
function useQuestionMutation<TInput, TResult>(eventId: string, send: (input: TInput) => Promise<TResult>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: send,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: heOrSheKeys.view(eventId) });
        },
    });
}

export function useCreateHeOrSheQuestion(eventId: string) {
    return useQuestionMutation(eventId, (input: QuizQuestionRequestDto) =>
        api.post<QuizQuestionDto>(endpoints.events.heOrSheQuestions(eventId), input),
    );
}

export function useUpdateHeOrSheQuestion(eventId: string) {
    return useQuestionMutation(eventId, ({ questionId, patch }: { questionId: string; patch: QuizQuestionPatchDto }) =>
        api.patch<QuizQuestionDto>(endpoints.events.heOrSheQuestion(eventId, questionId), patch),
    );
}

export function useDeleteHeOrSheQuestion(eventId: string) {
    return useQuestionMutation(eventId, (questionId: string) => api.del<void>(endpoints.events.heOrSheQuestion(eventId, questionId)));
}
