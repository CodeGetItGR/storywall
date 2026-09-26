'use client';

import { useTranslations } from 'next-intl';

import type { RsvpSessionQuestion } from '@/hooks/useRsvpSessionQuestions';
import { cn } from '@/lib/utils';

export function RsvpSessionQuestions({
    questions,
    onAnswerAction,
}: {
    questions: RsvpSessionQuestion[];
    onAnswerAction: (sessionId: string, isAttending: boolean) => void;
}) {
    const t = useTranslations('RSVPPage');
    const unanswered = questions.some((question) => question.answer === null);

    return (
        <div>
            {/* Heading */}
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('sessionsTitle')}</p>
            {unanswered && <p className="mb-2 text-xs text-ink-faint">{t('sessionsRequired')}</p>}

            {/* Questions */}
            <ul className="flex flex-col gap-2">
                {questions.map((question) => (
                    <RsvpSessionQuestionRow key={question.id} question={question} onAnswerAction={onAnswerAction} />
                ))}
            </ul>
        </div>
    );
}

function RsvpSessionQuestionRow({
    question,
    onAnswerAction,
}: {
    question: RsvpSessionQuestion;
    onAnswerAction: (sessionId: string, isAttending: boolean) => void;
}) {
    const tCommon = useTranslations('Common');

    function handleYes() {
        onAnswerAction(question.id, true);
    }

    function handleNo() {
        onAnswerAction(question.id, false);
    }

    return (
        <li className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
            {/* Session */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{question.title}</p>
                {question.when && <p className="text-xs text-ink-muted">{question.when}</p>}
            </div>

            {/* Answer */}
            <div className="flex shrink-0 gap-1.5">
                <button
                    type="button"
                    aria-pressed={question.answer === true}
                    onClick={handleYes}
                    className={cn(
                        'min-h-9 rounded-full border-2 px-3 text-xs font-semibold transition-all',
                        question.answer === true
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                            : 'border-border bg-card text-ink-muted hover:border-emerald-200',
                    )}
                >
                    {tCommon('yes')}
                </button>
                <button
                    type="button"
                    aria-pressed={question.answer === false}
                    onClick={handleNo}
                    className={cn(
                        'min-h-9 rounded-full border-2 px-3 text-xs font-semibold transition-all',
                        question.answer === false
                            ? 'border-rose-300 bg-rose-50 text-rose-500'
                            : 'border-border bg-card text-ink-muted hover:border-rose-200',
                    )}
                >
                    {tCommon('no')}
                </button>
            </div>
        </li>
    );
}
