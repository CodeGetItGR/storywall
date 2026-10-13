'use client';

import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import { fieldClass } from '@/components/heOrShe/fieldClass';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { useHeOrSheQuestionEditor } from '@/hooks/useHeOrSheQuestionEditor';
import type { QuizAnswerType } from '@/lib/api/types';
import { QUIZ_ANSWER_TYPES, QUIZ_MAX_OPTIONS, QUIZ_MIN_OPTIONS, QUIZ_OPTION_LABEL_MAX, QUIZ_PROMPT_MAX } from '@/lib/heOrShe';
import { cn } from '@/lib/utils';

type Editor = ReturnType<typeof useHeOrSheQuestionEditor>;

/** One extra question, created or edited in a focused modal. Delete lives here, behind a confirmation. */
export function QuestionEditorModal({ editor }: { editor: Editor }) {
    const t = useTranslations('HeOrShePage.host');
    const toErrorMessage = useApiErrorMessage();
    const id = useId();
    const draft = editor.draft;
    if (!draft) return null;

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

    const showGapHint = draft.answerType === 'FILL_GAP';
    const gapInvalid = showGapHint && draft.prompt.trim() !== '' && !editor.gapValid;

    return (
        <>
            <Modal open onClose={editor.close} size="sm" ariaLabel={editor.isNew ? t('newQuestion') : t('editQuestion')} closeLabel={t('cancel')}>
                <form onSubmit={editor.save} className="space-y-4 p-6">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-semibold text-ink">{editor.isNew ? t('newQuestion') : t('editQuestion')}</h2>

                    {/* Type */}
                    <div className="space-y-1.5">
                        <label htmlFor={`${id}-type`} className="text-xs font-semibold text-ink">
                            {t('type')}
                        </label>
                        <select id={`${id}-type`} value={draft.answerType} onChange={changeType} disabled={!editor.isNew} className={fieldClass}>
                            {QUIZ_ANSWER_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {t(`types.${type}`)}
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
