'use client';

import { type SubmitEvent, useState } from 'react';

import { useCreateHeOrSheQuestion, useDeleteHeOrSheQuestion, useUpdateHeOrSheQuestion } from '@/hooks/useHeOrShe';
import type { HeOrSheResultsDto, QuizAnswerType, QuizQuestionDto } from '@/lib/api/types';
import { hasOneGap, QUIZ_MAX_OPTIONS, QUIZ_MIN_OPTIONS, QUIZ_OPTION_LABEL_MAX, QUIZ_PROMPT_MAX } from '@/lib/heOrShe';

interface OptionDraft {
    // Kept when the option already exists, so its answers still point at it.
    id?: string;
    label: string;
}

interface EditorDraft {
    questionId: string | null;
    answerType: QuizAnswerType;
    prompt: string;
    options: OptionDraft[];
}

const EMPTY_OPTIONS: OptionDraft[] = [{ label: '' }, { label: '' }];

/** One extra question at a time, in a modal: create, edit, delete. */
export function useHeOrSheQuestionEditor(eventId: string, results: HeOrSheResultsDto | undefined) {
    const create = useCreateHeOrSheQuestion(eventId);
    const update = useUpdateHeOrSheQuestion(eventId);
    const remove = useDeleteHeOrSheQuestion(eventId);
    const [draft, setDraft] = useState<EditorDraft | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const isNew = draft?.questionId === null;
    // Options lock once anyone answered (the server says so with 5172 too).
    const optionsLocked = Boolean(
        draft?.questionId && results?.questions.some((question) => question.questionId === draft.questionId && question.answers.length > 0),
    );

    const prompt = draft?.prompt.trim() ?? '';
    const labels = draft?.options.map((option) => option.label.trim()) ?? [];
    const promptValid = prompt.length > 0 && [...prompt].length <= QUIZ_PROMPT_MAX;
    const gapValid = draft?.answerType !== 'FILL_GAP' || hasOneGap(prompt);
    const optionsValid =
        draft?.answerType !== 'CHOICE' ||
        (labels.length >= QUIZ_MIN_OPTIONS &&
            labels.length <= QUIZ_MAX_OPTIONS &&
            labels.every((label) => label.length > 0 && [...label].length <= QUIZ_OPTION_LABEL_MAX) &&
            new Set(labels.map((label) => label.toLowerCase())).size === labels.length);
    const isSaving = create.isPending || update.isPending;
    const canSave = draft !== null && promptValid && gapValid && optionsValid && !isSaving;

    function resetMutations() {
        create.reset();
        update.reset();
        remove.reset();
    }

    function openCreate() {
        resetMutations();
        setDraft({ questionId: null, answerType: 'YES_NO', prompt: '', options: EMPTY_OPTIONS });
    }

    function openEdit(question: QuizQuestionDto) {
        resetMutations();
        setDraft({
            questionId: question.id,
            answerType: question.answerType,
            prompt: question.prompt,
            options: question.options?.map((option) => ({ id: option.id, label: option.label })) ?? EMPTY_OPTIONS,
        });
    }

    function close() {
        setDraft(null);
        setConfirmingDelete(false);
    }

    function patch(change: Partial<EditorDraft>) {
        setDraft((current) => (current ? { ...current, ...change } : current));
    }

    function setAnswerType(answerType: QuizAnswerType) {
        // The type is fixed once the question exists.
        if (isNew) patch({ answerType });
    }

    function setPrompt(value: string) {
        patch({ prompt: value });
    }

    function setOptionLabel(index: number, label: string) {
        if (!draft || optionsLocked) return;
        patch({ options: draft.options.map((option, i) => (i === index ? { ...option, label } : option)) });
    }

    function addOption() {
        if (!draft || optionsLocked || draft.options.length >= QUIZ_MAX_OPTIONS) return;
        patch({ options: [...draft.options, { label: '' }] });
    }

    function removeOption(index: number) {
        if (!draft || optionsLocked || draft.options.length <= QUIZ_MIN_OPTIONS) return;
        patch({ options: draft.options.filter((_, i) => i !== index) });
    }

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft || !canSave) return;
        const isChoice = draft.answerType === 'CHOICE';
        try {
            if (draft.questionId === null) {
                await create.mutateAsync({ answerType: draft.answerType, prompt, ...(isChoice ? { options: labels } : {}) });
            } else {
                await update.mutateAsync({
                    questionId: draft.questionId,
                    patch: {
                        prompt,
                        ...(isChoice && !optionsLocked
                            ? { options: draft.options.map((option) => ({ ...(option.id ? { id: option.id } : {}), label: option.label.trim() })) }
                            : {}),
                    },
                });
            }
        } catch {
            return; // the error shows in the modal; keep the draft
        }
        close();
    }

    async function confirmDelete() {
        if (!draft?.questionId) return;
        try {
            await remove.mutateAsync(draft.questionId);
        } catch {
            setConfirmingDelete(false);
            return;
        }
        close();
    }

    return {
        draft,
        isNew,
        optionsLocked,
        gapValid,
        canSave,
        isSaving,
        error: create.error ?? update.error ?? remove.error,
        confirmingDelete,
        isDeleting: remove.isPending,
        openCreate,
        openEdit,
        close,
        setAnswerType,
        setPrompt,
        setOptionLabel,
        addOption,
        removeOption,
        save,
        askDelete: () => setConfirmingDelete(true),
        cancelDelete: () => setConfirmingDelete(false),
        confirmDelete,
    };
}
