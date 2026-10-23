'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useQuizPollsAnswer } from '@/hooks/useQuizPollsAnswer';
import type { QuizPollsQuestion, QuizPollsResultsDto, QuizPollsViewDto } from '@/lib/api/types';
import { formatAnswer } from '@/lib/heOrShe';
import { countsByValue, isPickType, pickOptions, type SideLabels, tallyTotal } from '@/lib/quizPolls';

/** Everything one question card shows, decided from the view the server sent. */
export function useQuizPollsQuestionCard({
    eventId,
    question,
    view,
    isHost,
    sides,
    results,
}: {
    eventId: string;
    question: QuizPollsQuestion;
    view: QuizPollsViewDto;
    isHost: boolean;
    sides: SideLabels;
    results: QuizPollsResultsDto | undefined;
}) {
    const t = useTranslations('QuizPollsPage');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const answer = useQuizPollsAnswer(eventId, question);
    const [showingAnswers, setShowingAnswers] = useState(false);

    const yesNo = { yes: t('yes'), no: t('no') };
    const labels = { ...sides, ...yesNo };
    const isQuiz = question.kind === 'QUIZ';
    const isPick = isPickType(question.answerType);
    // Hosts set the quiz answers, so they only vote in polls.
    const canAnswer = view.canAnswer && !(isHost && isQuiz);
    const hostAnswers = results?.questions.find((entry) => entry.questionId === question.id)?.answers ?? [];

    function format(value: string) {
        return formatAnswer(question, value, locale, labels);
    }

    return {
        isQuiz,
        isPick,
        canAnswer,
        options: isPick ? pickOptions(question, sides, yesNo) : [],
        counts: question.tally ? countsByValue(question.tally) : null,
        total: tallyTotal(question.tally),
        // A guest's quiz answer waits for the results; say so instead of showing nothing.
        waitingForResults: isQuiz && !isHost && question.myAnswer !== null && question.correctValue === null,
        myAnswerText: question.myAnswer !== null ? format(question.myAnswer) : null,
        correctText: question.correctValue !== null ? format(question.correctValue) : null,
        answer,
        sendErrorMessage: answer.sendError ? toErrorMessage(answer.sendError) : null,
        format,
        hostAnswers: hostAnswers.map((entry) => ({ ...entry, text: format(entry.value) })),
        showingAnswers,
        toggleAnswers: () => setShowingAnswers((current) => !current),
    };
}
