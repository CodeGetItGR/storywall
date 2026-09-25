import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useEventSessions } from '@/hooks/useEventSessions';
import { useCreateRsvpSessionResponse, useRsvpSessionResponses } from '@/hooks/useRsvps';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { formatShortDateTime } from '@/lib/datetime';
import { isModuleAvailable } from '@/lib/eventLifecycle';

export interface RsvpSessionQuestion {
    id: string;
    title: string;
    when: string | null;
    answer: boolean | null;
}

// The per-session "will you attend?" questions shown after a guest accepts.
// Only sessions the host opened (rsvpEnabled) are asked, and only while both
// rsvp and schedule are available. See plan-owned-modules-fe-integration.md §7.
// Every question needs an answer: a missing one is reported as "no answer", so
// the form doesn't send a "coming" RSVP until all are given. A guest editing
// their RSVP sees the answers they gave before.
export function useRsvpSessionQuestions(eventId: string | null, modules: EventModuleResponseDto[] | null | undefined, rsvpId: string | null) {
    const locale = useLocale();
    const isAvailable = isModuleAvailable(modules, 'rsvp') && isModuleAvailable(modules, 'schedule');
    const { data: sessions } = useEventSessions(isAvailable ? eventId : null);
    const createResponse = useCreateRsvpSessionResponse(eventId ?? '');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});

    const openSessions = useMemo(
        () => (sessions ?? []).filter((session) => session.rsvpEnabled).sort((a, b) => a.displayOrder - b.displayOrder),
        [sessions],
    );
    const { data: savedResponses } = useRsvpSessionResponses(isAvailable && openSessions.length > 0 ? rsvpId : null);
    const saved = useMemo(() => new Map((savedResponses ?? []).map((response) => [response.eventSessionId, response.isAttending])), [savedResponses]);

    const questions = useMemo<RsvpSessionQuestion[]>(
        () =>
            openSessions.map((session) => ({
                id: session.id,
                title: session.title,
                when: session.startAt ? formatShortDateTime(session.startAt, locale) : null,
                answer: answers[session.id] ?? saved.get(session.id) ?? null,
            })),
        [answers, locale, openSessions, saved],
    );

    const onAnswer = useCallback((sessionId: string, isAttending: boolean) => {
        setAnswers((current) => ({ ...current, [sessionId]: isAttending }));
    }, []);

    // POST upserts, so this also covers a guest answering again. A session the
    // host closed in the meantime fails with 5086; the mutation refetches the
    // sessions, which drops that question.
    const submitAnswers = useCallback(
        async (rsvpId: string) => {
            const answered = questions.filter((question) => question.answer !== null);
            await Promise.allSettled(
                answered.map((question) =>
                    createResponse.mutateAsync({ rsvpId, eventSessionId: question.id, isAttending: question.answer as boolean }),
                ),
            );
        },
        [createResponse, questions],
    );

    const visibleQuestions = isAvailable ? questions : [];

    return {
        questions: visibleQuestions,
        allAnswered: visibleQuestions.every((question) => question.answer !== null),
        onAnswer,
        submitAnswers,
    };
}
