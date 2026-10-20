'use client';

import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import { fieldClass } from '@/components/heOrShe/fieldClass';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { useQuizPollsQuestionEditor } from '@/hooks/useQuizPollsQuestionEditor';
import type { QuizAnswerType, QuizQuestionKind } from '@/lib/api/types';
import { QUIZ_MAX_OPTIONS, QUIZ_MIN_OPTIONS, QUIZ_OPTION_LABEL_MAX, QUIZ_PROMPT_MAX } from '@/lib/heOrShe';
import { type SideLabels, typesFor } from '@/lib/quizPolls';
import { cn } from '@/lib/utils';

type Editor = ReturnType<typeof useQuizPollsQuestionEditor>;

const KINDS: QuizQuestionKind[] = ['QUIZ', 'POLL'];

/** One question, created or edited in a focused modal. Delete lives here, behind a confirmation. */
export function QuestionEditorModal({ editor, sides }: { editor: Editor; sides: SideLabels }) {
    const t = useTranslations('QuizPollsPage.host');
    const tPage = useTranslations('QuizPollsPage');
    const toErrorMessage = useApiErrorMessage();
    const id = useId();
    const draft = editor.draft;
    if (!draft) return null;

    function changeKind(event: React.MouseEvent<HTMLButtonElement>) {
        editor.setKind(event.currentTarget.dataset.kind as QuizQuestionKind);
    }
    function changeType(event: React.ChangeEvent<HTMLSelectElement>) {
        editor.setAnswerType(event.currentTarget.value as QuizAnswerType);
    }
    function changePrompt(event: React.ChangeEvent<HTMLInputElement>) {
        editor.setPrompt(event.currentTarget.value);
    }
    function changeOption(event: React.ChangeEvent<HTMLInputElement>) {
        editor.setOptionLabel(Number(event.currentTarget.dataset.index), event.currentTarget.value);
    }
    function removeOption(event: React.MouseEvent<HTMLButtonElement>) {
        editor.removeOption(Number(event.currentTarget.dataset.index));
    }
    function changeCorrect(event: React.ChangeEvent<HTMLInputElement>) {
        editor.setCorrect(event.currentTarget.value);
    }

    const showGapHint = draft.answerType === 'FILL_GAP';
    const gapInvalid = showGapHint && draft.prompt.trim() !== '' && !editor.gapValid;
    const correctChoices =
        draft.answerType === 'CHOICE'
            ? draft.options.map((option, index) => ({ value: String(index), label: option.label.trim() || t('option', { number: index + 1 }) }))
            : draft.answerType === 'YES_NO'
              ? [
                    { value: 'YES', label: tPage('yes') },
                    { value: 'NO', label: tPage('no') },
                ]
              : [
                    { value: 'HE', label: sides.he },
                    { value: 'SHE', label: sides.she },
                ];

    return (
        <>
            <Modal open onClose={editor.close} size="sm" ariaLabel={editor.isNew ? t('newQuestion') : t('editQuestion')} closeLabel={t('cancel')}>
                <form onSubmit={editor.save} className="space-y-4 p-6">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-semibold text-ink">{editor.isNew ? t('newQuestion') : t('editQuestion')}</h2>

                    {/* Kind */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-ink">{t('kind')}</span>
                        <div role="group" aria-label={t('kind')} className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
                            {KINDS.map((kind) => (
                                <button
                                    key={kind}
                                    type="button"
                                    data-kind={kind}
                                    aria-pressed={draft.kind === kind}
                                    disabled={!editor.isNew}
                                    onClick={changeKind}
                                    className={cn(
                                        'h-9 rounded-full text-sm font-semibold transition-colors disabled:cursor-default',
                                        draft.kind === kind ? 'bg-background text-ink shadow-sm' : 'text-ink-muted',
                                    )}
                                >
                                    {tPage(`kinds.${kind}`)}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-ink-faint">{t(`kindHints.${draft.kind}`)}</p>
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                        <label htmlFor={`${id}-type`} className="text-xs font-semibold text-ink">
                            {t('type')}
                        </label>
                        <select id={`${id}-type`} value={draft.answerType} onChange={changeType} disabled={!editor.isNew} className={fieldClass}>
                            {typesFor(draft.kind).map((type) => (
                                <option key={type} value={type}>
                                    {t(`types.${type}`, sides)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Question */}
                    <div className="space-y-1.5">
                        <label htmlFor={`${id}-prompt`} className="text-xs font-semibold text-ink">
                            {t('prompt')}
                        </label>
                        <input
                            id={`${id}-prompt`}
                            value={draft.prompt}
                            onChange={changePrompt}
                            maxLength={QUIZ_PROMPT_MAX}
                            aria-invalid={gapInvalid}
                            aria-describedby={showGapHint ? `${id}-gap` : undefined}
                            className={fieldClass}
                        />
                        {showGapHint && (
                            <p id={`${id}-gap`} className={cn('text-xs', gapInvalid ? 'text-rose-600' : 'text-ink-faint')}>
                                {t('fillGapHint')}
                            </p>
                        )}
                    </div>

                    {/* Options */}
                    {draft.answerType === 'CHOICE' && (
                        <fieldset className="space-y-2" disabled={editor.optionsLocked}>
                            <legend className="text-xs font-semibold text-ink">{t('options')}</legend>
                            {editor.optionsLocked && <p className="text-xs text-ink-faint">{t('optionsLocked')}</p>}
                            {draft.options.map((option, index) => (
                                <div key={option.id ?? `new-${index}`} className="flex items-center gap-2">
                                    <input
                                        data-index={index}
                                        aria-label={t('option', { number: index + 1 })}
                                        value={option.label}
                                        onChange={changeOption}
                                        maxLength={QUIZ_OPTION_LABEL_MAX}
                                        className={fieldClass}
                                    />
                                    {!editor.optionsLocked && draft.options.length > QUIZ_MIN_OPTIONS && (
                                        <button
                                            type="button"
                                            data-index={index}
                                            onClick={removeOption}
                                            aria-label={t('removeOption', { number: index + 1 })}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                                        >
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!editor.optionsLocked && draft.options.length < QUIZ_MAX_OPTIONS && (
                                <button
                                    type="button"
                                    onClick={editor.addOption}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                                >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    {t('addOption')}
                                </button>
                            )}
                        </fieldset>
                    )}

                    {/* Right answer */}
                    {draft.kind === 'QUIZ' && (
                        <fieldset className="space-y-2">
                            <legend className="text-xs font-semibold text-ink">{t('rightAnswer')}</legend>
                            <div className="flex flex-col gap-2">
                                {correctChoices.map((choice) => (
                                    <label
                                        key={choice.value}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-sm transition-colors',
                                            draft.correct === choice.value
                                                ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-800'
                                                : 'border-border bg-surface-muted text-ink',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name={`${id}-correct`}
                                            value={choice.value}
                                            checked={draft.correct === choice.value}
                                            onChange={changeCorrect}
                                            className="accent-emerald-600"
                                        />
                                        {choice.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {editor.error && (
                        <p role="alert" className="text-xs text-rose-600">
                            {toErrorMessage(editor.error)}
                        </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                        {!editor.isNew ? (
                            <button
                                type="button"
                                onClick={editor.askDelete}
                                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('deleteQuestion')}
                            </button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={editor.close} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-muted">
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!editor.canSave}
                                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
                            >
                                {editor.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmActionModal
                open={editor.confirmingDelete}
                title={t('deleteConfirmTitle')}
                body={t('deleteConfirmBody')}
                confirmLabel={t('deleteConfirmAction')}
                cancelLabel={t('cancel')}
                isConfirming={editor.isDeleting}
                onCloseAction={editor.cancelDelete}
                onConfirmAction={editor.confirmDelete}
            />
        </>
    );
}
