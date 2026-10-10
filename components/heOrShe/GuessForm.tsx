'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import { ExtraQuestionField } from '@/components/heOrShe/ExtraQuestionField';
import { GuessButtons } from '@/components/heOrShe/GuessButtons';
import type { HeOrSheValue, QuizQuestionDto } from '@/lib/api/types';
import type { QuizAnswerError } from '@/lib/heOrShe';

interface GuessFormProps {
    questions: QuizQuestionDto[];
    guess: HeOrSheValue | null;
    answers: Record<string, string>;
    errors: Record<string, QuizAnswerError>;
    canSend: boolean;
    isSending: boolean;
    errorMessage: string | null;
    onGuessAction: (value: HeOrSheValue) => void;
    onAnswerAction: (questionId: string, value: string) => void;
    onSubmitAction: (event: React.SubmitEvent<HTMLFormElement>) => void;
}

export function GuessForm({
    questions,
    guess,
    answers,
    errors,
    canSend,
    isSending,
    errorMessage,
    onGuessAction,
    onAnswerAction,
    onSubmitAction,
}: GuessFormProps) {
    const t = useTranslations('HeOrShePage');
    return (
        <form onSubmit={onSubmitAction} className="space-y-8">
            {/* Guess */}
            <section className="space-y-3">
                <h2 className="text-center text-base font-semibold text-ink">{t('yourGuess')}</h2>
                <GuessButtons label={t('yourGuess')} value={guess} onChangeAction={onGuessAction} disabled={isSending} />
            </section>

            {/* Extra questions */}
            {questions.length > 0 && (
                <section className="space-y-5">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-base font-semibold text-ink">{t('extraQuestions')}</h2>
                        <span className="text-xs text-ink-faint">{t('optional')}</span>
                    </div>
                    {questions.map((question) => (
                        <ExtraQuestionField
                            key={question.id}
                            question={question}
                            value={answers[question.id] ?? ''}
                            error={errors[question.id]}
                            disabled={isSending}
                            onChangeAction={onAnswerAction}
                        />
                    ))}
                </section>
            )}

            {/* Send */}
            <div className="space-y-2">
                {errorMessage && (
                    <p role="alert" className="text-center text-xs text-rose-600">
                        {errorMessage}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={!canSend}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:opacity-50"
                >
                    {isSending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('send')}
                </button>
            </div>
        </form>
    );
}
