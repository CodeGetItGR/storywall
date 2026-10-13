'use client';

import { type SubmitEvent, useState } from 'react';

import { useSendHeOrSheAnswers } from '@/hooks/useHeOrShe';
import type { HeOrSheValue, HeOrSheViewDto } from '@/lib/api/types';
import { answerError, type QuizAnswerError, toAnswerValue } from '@/lib/heOrShe';

interface Draft {
    guess: HeOrSheValue | null;
    // questionId -> what the field holds, not yet canonical.
    answers: Record<string, string>;
}

function seed(view: HeOrSheViewDto): Draft {
    return { guess: view.myGuess, answers: { ...view.myAnswers } };
}

/**
 * The guess form. A member who hasn't guessed sees it open; after sending it closes, and
 * "Change my answers" reopens it with what they sent. It never opens once guessing is closed.
 */
export function useHeOrSheGuessForm(eventId: string, view: HeOrSheViewDto) {
    const send = useSendHeOrSheAnswers(eventId);
    // null: not being edited, so the form shows the saved answers.
    const [draft, setDraft] = useState<Draft | null>(null);
    const answered = view.myGuess !== null;
    const editing = view.canGuess && (draft !== null || !answered);
    const current = draft ?? seed(view);

    const errors: Record<string, QuizAnswerError> = {};
    for (const question of view.questions) {
        const error = answerError(question.answerType, toAnswerValue(question.answerType, current.answers[question.id] ?? ''));
        if (error) errors[question.id] = error;
    }
    const canSend = current.guess !== null && Object.keys(errors).length === 0 && !send.isPending;

    function setGuess(guess: HeOrSheValue) {
        setDraft({ ...current, guess });
    }

    function setAnswer(questionId: string, value: string) {
        setDraft({ ...current, answers: { ...current.answers, [questionId]: value } });
    }

    function startEditing() {
        setDraft(seed(view));
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSend || current.guess === null) return;
        const answers = view.questions.flatMap((question) => {
            const value = toAnswerValue(question.answerType, current.answers[question.id] ?? '');
            return value === null ? [] : [{ questionId: question.id, value }];
        });
        try {
            await send.mutateAsync({ guess: current.guess, answers });
        } catch {
            return; // send.error shows; the draft stays so nothing typed is lost
        }
        setDraft(null);
    }

    return {
        editing,
        answered,
        guess: current.guess,
        answers: current.answers,
        errors,
        canSend,
        isSending: send.isPending,
        error: send.error,
        setGuess,
        setAnswer,
        startEditing,
        submit,
    };
}
