'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import type { QuizQuestionDto } from '@/lib/api/types';
import { HE_OR_SHE_MAX_QUESTIONS } from '@/lib/heOrShe';

/** The extra questions as compact read-only rows. Tapping one opens it in the editor. */
export function QuestionRows({
    questions,
    locked,
    onAddAction,
    onEditAction,
}: {
    questions: QuizQuestionDto[];
    locked: boolean;
    onAddAction: () => void;
    onEditAction: (question: QuizQuestionDto) => void;
}) {
    const t = useTranslations('HeOrShePage.host');
    const full = questions.length >= HE_OR_SHE_MAX_QUESTIONS;

    function edit(event: React.MouseEvent<HTMLButtonElement>) {
        const question = questions.find((item) => item.id === event.currentTarget.dataset.questionId);
        if (question) onEditAction(question);
    }

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">{t('questionsTitle')}</h2>
                {!locked && (
                    <button
                        type="button"
                        onClick={onAddAction}
                        disabled={full}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-semibold text-ink disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('addQuestion')}
                    </button>
                )}
            </div>
            {!locked && full && <p className="text-xs text-ink-faint">{t('questionLimit', { max: HE_OR_SHE_MAX_QUESTIONS })}</p>}

            {/* Rows */}
            {questions.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('noQuestions')}</p>
            ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface-muted/60">
                    {questions.map((question) => (
                        <li key={question.id}>
                            <button
                                type="button"
                                data-question-id={question.id}
                                onClick={edit}
                                disabled={locked}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{question.prompt}</span>
                                    <span className="block text-xs text-ink-muted">{t(`types.${question.answerType}`)}</span>
                                </span>
                                {!locked && <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
