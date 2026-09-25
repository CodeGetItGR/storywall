import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useEventSessions } from '@/hooks/useEventSessions';
import { useCreateRsvpSessionResponse } from '@/hooks/useRsvps';
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
export function useRsvpSessionQuestions(eventId: string | null, modules: EventModuleResponseDto[] | null | undefined) {
    const locale = useLocale();
    const isAvailable = isModuleAvailable(modules, 'rsvp') && isModuleAvailable(modules, 'schedule');
    const { data: sessions } = useEventSessions(isAvailable ? eventId : null);
    const createResponse = useCreateRsvpSessionResponse(eventId ?? '');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});

    const questions = useMemo<RsvpSessionQuestion[]>(
        () =>
            (sessions ?? [])
                .filter((session) => session.rsvpEnabled)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((session) => ({
                    id: session.id,
                    title: session.title,
                    when: session.startAt ? formatShortDateTime(session.startAt, locale) : null,
                    answer: answers[session.id] ?? null,
                })),
        [answers, locale, sessions],
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

    return {
        questions: isAvailable ? questions : [],
        onAnswer,
        submitAnswers,
    };
}
