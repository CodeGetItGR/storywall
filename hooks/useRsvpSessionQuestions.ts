import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useEventSessions } from '@/hooks/useEventSessions';
import { useCreateRsvpSessionResponse } from '@/hooks/useRsvps';
import { isNotFoundError, isRsvpNotAttendingError, isSessionRsvpNotEnabledError } from '@/lib/api/errors';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { formatShortDateTime } from '@/lib/datetime';
import { isModuleAvailable } from '@/lib/eventLifecycle';

export interface RsvpSessionQuestion {
    id: string;
    title: string;
    when: string | null;
    answer: boolean | null;
}

export type AttendingStatus = 'attending' | 'not-attending';

// The per-session "will you attend?" questions shown after a guest accepts.
// Only sessions the host opened (rsvpEnabled) are asked, and only while both
// rsvp and schedule are available. See plan-owned-modules-fe-integration.md §7.
// Every question needs an answer: a missing one is reported as "no answer", so
// the form doesn't send a "coming" RSVP until all are given.
export function useRsvpSessionQuestions(eventId: string | null, modules: EventModuleResponseDto[] | null | undefined) {
    const locale = useLocale();
    const isAvailable = isModuleAvailable(modules, 'rsvp') && isModuleAvailable(modules, 'schedule');
    const sessionsQuery = useEventSessions(isAvailable ? eventId : null);
    const createResponse = useCreateRsvpSessionResponse(eventId ?? '');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});

    const openSessions = useMemo(
        () => (sessionsQuery.data ?? []).filter((session) => session.rsvpEnabled).sort((a, b) => a.displayOrder - b.displayOrder),
        [sessionsQuery.data],
    );

    const questions = useMemo<RsvpSessionQuestion[]>(
        () =>
            openSessions.map((session) => ({
                id: session.id,
                title: session.title,
                when: session.startAt ? formatShortDateTime(session.startAt, locale) : null,
                answer: answers[session.id] ?? null,
            })),
        [answers, locale, openSessions],
    );

    const onAnswer = useCallback((sessionId: string, isAttending: boolean) => {
        setAnswers((current) => ({ ...current, [sessionId]: isAttending }));
    }, []);

    // POST upserts, so this also covers a guest answering again. A session the
    // host closed in the meantime fails with 5086 (session closed), a deleted
    // session fails with 404, and 5087 means the RSVP itself was declined
    // elsewhere — all three are expected races, not real failures, so they're
    // swallowed; the mutation's own onError already refetches the stale
    // sessions/RSVP. Anything else is rethrown so the caller can surface it
    // and keep the guest on the form instead of quietly dropping their answers.
    const submitAnswers = useCallback(
        async (rsvpId: string) => {
            const answered = questions.filter((question) => question.answer !== null);
            const results = await Promise.allSettled(
                answered.map((question) =>
                    createResponse.mutateAsync({ rsvpId, eventSessionId: question.id, isAttending: question.answer as boolean }),
                ),
            );
            const unexpected = results.find(
                (result): result is PromiseRejectedResult =>
                    result.status === 'rejected' &&
                    !isSessionRsvpNotEnabledError(result.reason) &&
                    !isRsvpNotAttendingError(result.reason) &&
                    !isNotFoundError(result.reason),
            );
            if (unexpected) throw unexpected.reason;
        },
        [createResponse, questions],
    );

    const visibleQuestions = isAvailable ? questions : [];
    // Until the sessions query has settled we don't yet know the real question
    // list, so treating it as "answered" here would let an ATTENDING RSVP
    // through with none. `isLoading` alone misses a query that's paused
    // offline (fetchStatus 'paused') under the default networkMode: 'online',
    // where isLoading is already false — so "not ready" is "still pending and
    // actually trying", which also naturally excludes a disabled query
    // (fetchStatus 'idle' while pending). A load failure is terminal — the
    // query won't retry forever — so it's treated the same as "no questions"
    // instead of stranding the guest on a form they can never submit.
    const isSessionsSettling = sessionsQuery.isPending && sessionsQuery.fetchStatus !== 'idle';
    const isReady = !isSessionsSettling;

    return {
        questions: visibleQuestions,
        allAnswered: isAvailable ? isReady && visibleQuestions.every((question) => question.answer !== null) : true,
        isReady,
        onAnswer,
        submitAnswers,
    };
}

// Session answers are required only when the guest says they're coming; a
// decline has none and is never blocked by this. Pulled out so the rule can
// be tested without rendering the full submit-page hook.
export function computeHasUnansweredSessions(attending: AttendingStatus | null, allAnswered: boolean): boolean {
    return attending === 'attending' && !allAnswered;
}
