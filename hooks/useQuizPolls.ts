'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    QuizPollsQuestion,
    QuizPollsQuestionPatchDto,
    QuizPollsQuestionRequestDto,
    QuizPollsResultsDto,
    QuizPollsSettingsRequestDto,
    QuizPollsViewDto,
} from '@/lib/api/types';
import { msUntilClose } from '@/lib/heOrShe';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';

export const QUIZ_POLLS_MODULE = 'quiz_polls';

export const quizPollsKeys = {
    view: (eventId: string) => ['events', eventId, 'quiz-polls'] as const,
    results: (eventId: string) => ['events', eventId, 'quiz-polls', 'results'] as const,
};

// setTimeout overflows past ~24.8 days; a closing time further out is refetched on the next visit anyway.
const MAX_TIMER_MS = 2_147_483_647;

/**
 * The role-aware view. "Closed" is computed on read, so while the page is open a timer refetches
 * the moment the closing time passes and the results appear.
 */
export function useQuizPolls(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, QUIZ_POLLS_MODULE);
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: quizPollsKeys.view(eventId ?? ''),
        queryFn: () => api.get<QuizPollsViewDto>(endpoints.events.quizPolls(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && readable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });

    const status = query.data?.status;
    const closesAt = query.data?.closesAt ?? null;
    useEffect(() => {
        if (!eventId || status !== 'OPEN') return;
        const wait = msUntilClose(closesAt);
        if (wait === null || wait > MAX_TIMER_MS) return;
        // A second's slack, so the server's clock has passed closesAt too.
        const timer = setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: quizPollsKeys.view(eventId) });
        }, wait + 1000);
        return () => clearTimeout(timer);
    }, [closesAt, eventId, queryClient, status]);

    return query;
}

/** Every answer by name. Hosts only. */
export function useQuizPollsResults(eventId: string | null, isHost: boolean) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, QUIZ_POLLS_MODULE);
    return useQuery({
        queryKey: quizPollsKeys.results(eventId ?? ''),
        queryFn: () => api.get<QuizPollsResultsDto>(endpoints.events.quizPollsResults(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && readable && isHost,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}

/** The writes that answer with the whole view put it straight into the cache. */
function useViewMutation<TInput>(eventId: string, send: (input: TInput) => Promise<QuizPollsViewDto>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: send,
        onSuccess: (view) => {
            queryClient.setQueryData(quizPollsKeys.view(eventId), view);
            void queryClient.invalidateQueries({ queryKey: quizPollsKeys.results(eventId) });
        },
    });
}

export function useAnswerQuizPollsQuestion(eventId: string) {
    return useViewMutation(eventId, ({ questionId, value }: { questionId: string; value: string }) =>
        api.put<QuizPollsViewDto>(endpoints.events.quizPollsAnswer(eventId, questionId), { value }),
    );
}

export function useUpdateQuizPollsSettings(eventId: string) {
    return useViewMutation(eventId, (input: QuizPollsSettingsRequestDto) =>
        api.put<QuizPollsViewDto>(endpoints.events.quizPollsSettings(eventId), input),
    );
}

export function useCloseQuizPolls(eventId: string) {
    return useViewMutation(eventId, () => api.post<QuizPollsViewDto>(endpoints.events.quizPollsClose(eventId)));
}

/** Question writes don't return the view: refetch it. */
function useQuestionMutation<TInput, TResult>(eventId: string, send: (input: TInput) => Promise<TResult>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: send,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: quizPollsKeys.view(eventId) });
        },
    });
}

export function useCreateQuizPollsQuestion(eventId: string) {
    return useQuestionMutation(eventId, (input: QuizPollsQuestionRequestDto) =>
        api.post<QuizPollsQuestion>(endpoints.events.quizPollsQuestions(eventId), input),
    );
}

export function useUpdateQuizPollsQuestion(eventId: string) {
    return useQuestionMutation(eventId, ({ questionId, patch }: { questionId: string; patch: QuizPollsQuestionPatchDto }) =>
        api.patch<QuizPollsQuestion>(endpoints.events.quizPollsQuestion(eventId, questionId), patch),
    );
}

export function useDeleteQuizPollsQuestion(eventId: string) {
    return useQuestionMutation(eventId, (questionId: string) => api.del<void>(endpoints.events.quizPollsQuestion(eventId, questionId)));
}
