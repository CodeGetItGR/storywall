'use client';

import { type SubmitEvent, useState } from 'react';

import { useAnswerQuizPollsQuestion } from '@/hooks/useQuizPolls';
import type { QuizPollsQuestion } from '@/lib/api/types';
import { answerError, toAnswerValue } from '@/lib/heOrShe';

/**
 * One question's answer. A pick (choice, yes/no, he/she) is sent the moment it's tapped; a typed
 * answer is drafted and sent with its own button.
 */
export function useQuizPollsAnswer(eventId: string, question: QuizPollsQuestion) {
    const send = useAnswerQuizPollsQuestion(eventId);
    // null: nothing typed, so the field shows the saved answer.
    const [draft, setDraft] = useState<string | null>(null);

    const text = draft ?? question.myAnswer ?? '';
    const value = toAnswerValue(question.answerType, text);
    const error = answerError(question.answerType, value);
    const changed = value !== null && value !== question.myAnswer;
    const canSend = changed && error === null && !send.isPending;

    async function sendValue(next: string) {
        try {
            await send.mutateAsync({ questionId: question.id, value: next });
        } catch {
            return; // send.error shows; a typed draft stays so nothing is lost
        }
        setDraft(null);
    }

    function pick(next: string) {
        if (send.isPending || next === question.myAnswer) return;
        void sendValue(next);
    }

    function setText(_questionId: string, next: string) {
        setDraft(next);
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSend || value === null) return;
        await sendValue(value);
    }

    return {
        text,
        // Only once something was typed: an empty field isn't an error.
        error: draft === null ? null : error,
        canSend,
        isSending: send.isPending,
        sendError: send.error,
        pick,
        setText,
        submit,
    };
}
