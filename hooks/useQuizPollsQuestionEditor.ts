'use client';

import { type SubmitEvent, useState } from 'react';

import { useCreateQuizPollsQuestion, useDeleteQuizPollsQuestion, useUpdateQuizPollsQuestion } from '@/hooks/useQuizPolls';
import type { QuizAnswerType, QuizPollsQuestion, QuizPollsResultsDto, QuizQuestionKind } from '@/lib/api/types';
import { hasOneGap, QUIZ_MAX_OPTIONS, QUIZ_MIN_OPTIONS, QUIZ_OPTION_LABEL_MAX, QUIZ_PROMPT_MAX } from '@/lib/heOrShe';
import { typesFor } from '@/lib/quizPolls';

interface OptionDraft {
    // Kept when the option already exists, so its answers still point at it.
    id?: string;
    label: string;
}

interface EditorDraft {
    questionId: string | null;
    kind: QuizQuestionKind;
    answerType: QuizAnswerType;
    prompt: string;
    options: OptionDraft[];
    // A quiz question's answer: HE/SHE or YES/NO, or for CHOICE the option's index.
    correct: string | null;
}

const EMPTY_OPTIONS: OptionDraft[] = [{ label: '' }, { label: '' }];

function correctFor(question: QuizPollsQuestion): string | null {
    if (question.kind !== 'QUIZ' || question.correctValue === null) return null;
    if (question.answerType !== 'CHOICE') return question.correctValue;
    const index = question.options?.findIndex((option) => option.id === question.correctValue) ?? -1;
    return index < 0 ? null : String(index);
}

/** One question at a time, in a modal: create, edit, delete. */
export function useQuizPollsQuestionEditor(eventId: string, results: QuizPollsResultsDto | undefined) {
    const create = useCreateQuizPollsQuestion(eventId);
    const update = useUpdateQuizPollsQuestion(eventId);
    const remove = useDeleteQuizPollsQuestion(eventId);
    const [draft, setDraft] = useState<EditorDraft | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const isNew = draft?.questionId === null;
    // Options lock once anyone answered (the server says so with 5172 too).
    const optionsLocked = Boolean(
        draft?.questionId && results?.questions.some((question) => question.questionId === draft.questionId && question.answers.length > 0),
    );

    const prompt = draft?.prompt.trim() ?? '';
    const labels = draft?.options.map((option) => option.label.trim()) ?? [];
    const isChoice = draft?.answerType === 'CHOICE';
    const isQuiz = draft?.kind === 'QUIZ';
    const promptValid = prompt.length > 0 && [...prompt].length <= QUIZ_PROMPT_MAX;
    const gapValid = draft?.answerType !== 'FILL_GAP' || hasOneGap(prompt);
    const optionsValid =
        !isChoice ||
        (labels.length >= QUIZ_MIN_OPTIONS &&
            labels.length <= QUIZ_MAX_OPTIONS &&
            labels.every((label) => label.length > 0 && [...label].length <= QUIZ_OPTION_LABEL_MAX) &&
            new Set(labels.map((label) => label.toLowerCase())).size === labels.length);
    const correctValid = !isQuiz || (draft?.correct ?? null) !== null;
    const isSaving = create.isPending || update.isPending;
    const canSave = draft !== null && promptValid && gapValid && optionsValid && correctValid && !isSaving;

    function resetMutations() {
        create.reset();
        update.reset();
        remove.reset();
    }

    function openCreate() {
        resetMutations();
        setDraft({ questionId: null, kind: 'QUIZ', answerType: 'CHOICE', prompt: '', options: EMPTY_OPTIONS, correct: null });
    }

    function openEdit(question: QuizPollsQuestion) {
        resetMutations();
        setDraft({
            questionId: question.id,
            kind: question.kind,
            answerType: question.answerType,
            prompt: question.prompt,
            options: question.options?.map((option) => ({ id: option.id, label: option.label })) ?? EMPTY_OPTIONS,
            correct: correctFor(question),
        });
    }

    function close() {
        setDraft(null);
        setConfirmingDelete(false);
    }

    function patch(change: Partial<EditorDraft>) {
        setDraft((current) => (current ? { ...current, ...change } : current));
    }

    // Kind and type are fixed once the question exists.
    function setKind(kind: QuizQuestionKind) {
        if (!draft || !isNew) return;
        const answerType = typesFor(kind).includes(draft.answerType) ? draft.answerType : typesFor(kind)[0];
        patch({ kind, answerType, correct: null });
    }

    function setAnswerType(answerType: QuizAnswerType) {
        if (isNew) patch({ answerType, correct: null });
    }

    function setPrompt(value: string) {
        patch({ prompt: value });
    }

    function setCorrect(value: string) {
        patch({ correct: value });
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
        const correct = draft.correct === null ? null : Number(draft.correct);
        patch({
            options: draft.options.filter((_, i) => i !== index),
            // The marked answer follows its option, or clears when it's the one removed.
            correct: correct === null || correct === index ? null : String(correct > index ? correct - 1 : correct),
        });
    }

    function correctValue(): string | undefined {
        if (!isQuiz || !draft || draft.correct === null) return undefined;
        return isChoice ? labels[Number(draft.correct)] : draft.correct;
    }

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft || !canSave) return;
        try {
            if (draft.questionId === null) {
                await create.mutateAsync({
                    kind: draft.kind,
                    answerType: draft.answerType,
                    prompt,
                    ...(isChoice ? { options: labels } : {}),
                    ...(isQuiz ? { correctValue: correctValue() } : {}),
                });
            } else {
                await update.mutateAsync({
                    questionId: draft.questionId,
                    patch: {
                        prompt,
                        ...(isChoice && !optionsLocked
                            ? { options: draft.options.map((option) => ({ ...(option.id ? { id: option.id } : {}), label: option.label.trim() })) }
                            : {}),
                        ...(isQuiz ? { correctValue: correctValue() } : {}),
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
        setKind,
        setAnswerType,
        setPrompt,
        setCorrect,
        setOptionLabel,
        addOption,
        removeOption,
        save,
        askDelete: () => setConfirmingDelete(true),
        cancelDelete: () => setConfirmingDelete(false),
        confirmDelete,
    };
}
