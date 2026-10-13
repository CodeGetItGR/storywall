'use client';

import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import { fieldClass } from '@/components/heOrShe/fieldClass';
import { GuessButtons } from '@/components/heOrShe/GuessButtons';
import type { HeOrSheValue, QuizQuestionDto } from '@/lib/api/types';
import { QUIZ_FILL_GAP_MAX, QUIZ_FREE_TEXT_MAX, type QuizAnswerError, splitFillGap } from '@/lib/heOrShe';
import { cn } from '@/lib/utils';

/** One optional extra question, with the input its type needs. */
export function ExtraQuestionField({
    question,
    value,
    error,
    disabled,
    onChangeAction,
}: {
    question: QuizQuestionDto;
    value: string;
    error: QuizAnswerError | undefined;
    disabled: boolean;
    onChangeAction: (questionId: string, value: string) => void;
}) {
    const t = useTranslations('HeOrShePage');
    const id = useId();
    const errorId = `${id}-error`;
    function change(next: string) {
        onChangeAction(question.id, next);
    }
    const invalid = Boolean(error);
    const describedBy = invalid ? errorId : undefined;

    return (
        <fieldset className="space-y-2" disabled={disabled}>
            {question.answerType === 'FILL_GAP' ? (
                <FillGap question={question} value={value} invalid={invalid} describedBy={describedBy} onChangeAction={change} />
            ) : (
                <>
                    <legend className="text-sm font-semibold text-ink">{question.prompt}</legend>
                    <Input question={question} value={value} invalid={invalid} describedBy={describedBy} onChangeAction={change} />
                </>
            )}
            {error && (
                <p id={errorId} className={cn('text-xs text-rose-600')}>
                    {t(`answerErrors.${error}`)}
                </p>
            )}
        </fieldset>
    );
}

interface InputProps {
    question: QuizQuestionDto;
    value: string;
    invalid: boolean;
    describedBy: string | undefined;
    onChangeAction: (value: string) => void;
}

function Input({ question, value, invalid, describedBy, onChangeAction }: InputProps) {
    const t = useTranslations('HeOrShePage');
    function changeText(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        onChangeAction(event.currentTarget.value);
    }
    switch (question.answerType) {
        case 'HE_SHE':
            return <GuessButtons size="sm" label={question.prompt} value={(value || null) as HeOrSheValue | null} onChangeAction={onChangeAction} />;
        case 'YES_NO':
            return (
                <Choices
                    name={question.id}
                    value={value}
                    onChangeAction={onChangeAction}
                    options={[
                        { id: 'YES', label: t('yes') },
                        { id: 'NO', label: t('no') },
                    ]}
                />
            );
        case 'CHOICE':
            return <Choices name={question.id} value={value} onChangeAction={onChangeAction} options={question.options ?? []} />;
        case 'DATE':
        case 'TIME':
            return (
                <input
                    type={question.answerType === 'DATE' ? 'date' : 'time'}
                    aria-label={question.prompt}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    value={value}
                    onChange={changeText}
                    className={fieldClass}
                />
            );
        case 'NUMBER':
            return (
                <input
                    inputMode="decimal"
                    aria-label={question.prompt}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    placeholder={t('numberPlaceholder')}
                    value={value}
                    onChange={changeText}
                    className={fieldClass}
                />
            );
        default:
            return (
                <textarea
                    rows={3}
                    maxLength={QUIZ_FREE_TEXT_MAX * 2}
                    aria-label={question.prompt}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    placeholder={t('answerPlaceholder')}
                    value={value}
                    onChange={changeText}
                    className={cn(fieldClass, 'resize-none')}
                />
            );
    }
}

function Choices({
    name,
    value,
    options,
    onChangeAction,
}: {
    name: string;
    value: string;
    options: { id: string; label: string }[];
    onChangeAction: (value: string) => void;
}) {
    function pick(event: React.ChangeEvent<HTMLInputElement>) {
        onChangeAction(event.currentTarget.value);
    }
    return (
        <div className="flex flex-col gap-2">
            {options.map((option) => (
                <label
                    key={option.id}
                    className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-colors',
                        value === option.id
                            ? 'border-primary bg-primary-light font-semibold text-primary-dark'
                            : 'border-border bg-surface-muted text-ink',
                    )}
                >
                    <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={pick} className="accent-primary" />
                    {option.label}
                </label>
            ))}
        </div>
    );
}

/** The prompt as a sentence with the answer field in its blank. */
function FillGap({ question, value, invalid, describedBy, onChangeAction }: InputProps) {
    const t = useTranslations('HeOrShePage');
    function changeText(event: React.ChangeEvent<HTMLInputElement>) {
        onChangeAction(event.currentTarget.value);
    }
    const { before, after } = splitFillGap(question.prompt);
    return (
        <>
            <legend className="sr-only">{question.prompt}</legend>
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                {before && <span>{before}</span>}
                <input
                    aria-label={question.prompt}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    maxLength={QUIZ_FILL_GAP_MAX * 2}
                    placeholder={t('answerPlaceholder')}
                    value={value}
                    onChange={changeText}
                    className={cn(fieldClass, 'w-40 flex-none py-1.5 font-normal')}
                />
                {after && <span>{after}</span>}
            </p>
        </>
    );
}
