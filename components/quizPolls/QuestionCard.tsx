'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HostAnswers } from '@/components/quizPolls/HostAnswers';
import { PickRows } from '@/components/quizPolls/PickRows';
import { TypedAnswerForm } from '@/components/quizPolls/TypedAnswerForm';
import { TypedTally } from '@/components/quizPolls/TypedTally';
import { useQuizPollsQuestionCard } from '@/hooks/useQuizPollsQuestionCard';
import type { QuizPollsQuestion, QuizPollsResultsDto, QuizPollsViewDto } from '@/lib/api/types';
import type { SideLabels } from '@/lib/quizPolls';
import { cn } from '@/lib/utils';

/** One question: answer it, then see the votes (polls) or, once closed, the right answer (quiz). */
export function QuestionCard({
    eventId,
    question,
    view,
    isHost,
    sides,
    results,
    onEditAction,
}: {
    eventId: string;
    question: QuizPollsQuestion;
    view: QuizPollsViewDto;
    isHost: boolean;
    sides: SideLabels;
    results: QuizPollsResultsDto | undefined;
    onEditAction: (question: QuizPollsQuestion) => void;
}) {
    const t = useTranslations('QuizPollsPage');
    const card = useQuizPollsQuestionCard({ eventId, question, view, isHost, sides, results });
    const typedForm = !card.isPick && card.canAnswer;

    function edit() {
        onEditAction(question);
    }

    return (
        <li className="space-y-3 py-5 first:pt-0 last:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <span
                    className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        card.isQuiz ? 'bg-primary-light text-primary-dark' : 'bg-surface-muted text-ink-muted',
                    )}
                >
                    {t(`kinds.${question.kind}`)}
                </span>
                {isHost && view.status === 'OPEN' && (
                    <button
                        type="button"
                        onClick={edit}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
                    >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('edit')}
                    </button>
                )}
            </div>

            {/* Prompt: a typed field shows it itself */}
            {!typedForm && <h3 className="text-base font-semibold text-ink">{question.prompt}</h3>}

            {/* Answer */}
            {card.isPick ? (
                <PickRows
                    label={question.prompt}
                    options={card.options}
                    selected={question.myAnswer}
                    correct={question.correctValue}
                    counts={card.counts}
                    total={card.total}
                    disabled={!card.canAnswer || card.answer.isSending}
                    onPickAction={card.answer.pick}
                />
            ) : typedForm ? (
                <TypedAnswerForm
                    question={question}
                    text={card.answer.text}
                    error={card.answer.error}
                    canSend={card.answer.canSend}
                    isSending={card.answer.isSending}
                    errorMessage={card.sendErrorMessage}
                    onTextAction={card.answer.setText}
                    onSubmitAction={card.answer.submit}
                />
            ) : (
                card.myAnswerText !== null && <p className="text-sm text-ink-muted">{t('yourAnswer', { answer: card.myAnswerText })}</p>
            )}
            {card.isPick && card.sendErrorMessage && (
                <p role="alert" className="text-xs text-rose-600">
                    {card.sendErrorMessage}
                </p>
            )}

            {/* Result */}
            {card.waitingForResults && <p className="text-xs text-ink-faint">{t('resultsAtClose')}</p>}
            {!card.isPick && card.correctText !== null && (
                <p className="text-sm font-semibold text-emerald-700">{t('rightAnswer', { answer: card.correctText })}</p>
            )}

            {/* Votes */}
            {question.tally && (
                <>
                    {!card.isPick && question.tally.length > 0 && <TypedTally entries={question.tally} format={card.format} />}
                    <p className="text-xs text-ink-muted">{t('votes', { count: card.total })}</p>
                </>
            )}

            {/* Host: who answered what */}
            {isHost && <HostAnswers answers={card.hostAnswers} open={card.showingAnswers} onToggleAction={card.toggleAnswers} />}
        </li>
    );
}
