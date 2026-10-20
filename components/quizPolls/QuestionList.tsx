'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QuestionCard } from '@/components/quizPolls/QuestionCard';
import type { QuizPollsQuestion, QuizPollsResultsDto, QuizPollsViewDto } from '@/lib/api/types';
import { QUIZ_POLLS_MAX_QUESTIONS, type SideLabels } from '@/lib/quizPolls';

/** Every question, answered in place. Hosts add and edit them from here too. */
export function QuestionList({
    eventId,
    view,
    isHost,
    sides,
    results,
    onAddAction,
    onEditAction,
}: {
    eventId: string;
    view: QuizPollsViewDto;
    isHost: boolean;
    sides: SideLabels;
    results: QuizPollsResultsDto | undefined;
    onAddAction: () => void;
    onEditAction: (question: QuizPollsQuestion) => void;
}) {
    const t = useTranslations('QuizPollsPage');
    const canAdd = isHost && view.status === 'OPEN';
    const full = view.questions.length >= QUIZ_POLLS_MAX_QUESTIONS;

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">{t('questionsTitle')}</h2>
                {canAdd && (
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
            {canAdd && full && <p className="text-xs text-ink-faint">{t('questionLimit', { max: QUIZ_POLLS_MAX_QUESTIONS })}</p>}

            {/* Questions */}
            {view.questions.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('noQuestions')}</p>
            ) : (
                <ul className="divide-y divide-border/60">
                    {view.questions.map((question) => (
                        <QuestionCard
                            key={question.id}
                            eventId={eventId}
                            question={question}
                            view={view}
                            isHost={isHost}
                            sides={sides}
                            results={results}
                            onEditAction={onEditAction}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
