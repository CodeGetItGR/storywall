'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { HeOrSheResultsDto, QuizQuestionDto } from '@/lib/api/types';
import { formatAnswer } from '@/lib/heOrShe';

export interface ResultPerson {
    memberId: string;
    displayName: string;
    avatarUrl: string | null;
}

/** The host's results, ready to render: Boy and Girl guessers, then each question's answers as text. */
export function useHeOrSheResultGroups(questions: QuizQuestionDto[], results: HeOrSheResultsDto | undefined) {
    const t = useTranslations('HeOrShePage');
    const locale = useLocale();
    const labels = { he: t('he'), she: t('she'), yes: t('yes'), no: t('no') };
    const main = results?.main ?? [];

    const answersByQuestion = new Map((results?.questions ?? []).map((entry) => [entry.questionId, entry.answers]));
    return {
        he: main.filter((guess) => guess.guess === 'HE'),
        she: main.filter((guess) => guess.guess === 'SHE'),
        questions: questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            answers: (answersByQuestion.get(question.id) ?? []).map((answer) => ({
                memberId: answer.memberId,
                displayName: answer.displayName,
                avatarUrl: answer.avatarUrl,
                text: formatAnswer(question, answer.value, locale, labels),
            })),
        })),
    };
}
