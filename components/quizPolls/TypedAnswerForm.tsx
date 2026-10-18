'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

import { ExtraQuestionField } from '@/components/heOrShe/ExtraQuestionField';
import type { QuizPollsQuestion } from '@/lib/api/types';
import type { QuizAnswerError } from '@/lib/heOrShe';

/** A typed answer (date, time, number, fill-in-the-gap, free text) with its own send button. */
export function TypedAnswerForm({
    question,
    text,
    error,
    canSend,
    isSending,
    errorMessage,
    onTextAction,
    onSubmitAction,
}: {
    question: QuizPollsQuestion;
    text: string;
    error: QuizAnswerError | null;
    canSend: boolean;
    isSending: boolean;
    errorMessage: string | null;
    onTextAction: (questionId: string, value: string) => void;
    onSubmitAction: (event: React.SubmitEvent<HTMLFormElement>) => void;
}) {
    const t = useTranslations('QuizPollsPage');
    return (
        <form onSubmit={onSubmitAction} className="space-y-3">
            <ExtraQuestionField question={question} value={text} error={error ?? undefined} disabled={isSending} onChangeAction={onTextAction} />
            {errorMessage && (
                <p role="alert" className="text-xs text-rose-600">
                    {errorMessage}
                </p>
            )}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!canSend}
                    className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
                >
                    {isSending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('send')}
                </button>
            </div>
        </form>
    );
}
