'use client';

import { type SubmitEvent, useState } from 'react';

import { useCloseQuizPolls, useUpdateQuizPollsSettings } from '@/hooks/useQuizPolls';
import type { QuizPollsViewDto } from '@/lib/api/types';
import { datetimeLocalValueToIso, toDatetimeLocalValue } from '@/lib/datetime';
import { QUIZ_POLLS_SIDE_LABEL_MAX } from '@/lib/quizPolls';

interface Draft {
    // A datetime-local value, '' for none.
    closesAt: string;
    heLabel: string;
    sheLabel: string;
}

function seed(view: QuizPollsViewDto): Draft {
    return { closesAt: toDatetimeLocalValue(view.closesAt), heLabel: view.heLabel ?? '', sheLabel: view.sheLabel ?? '' };
}

/**
 * The closing time and the names of the two He/She sides. Saving also works once closed: a future
 * time, or none, opens answers again. "Close now" sits behind a confirmation.
 */
export function useQuizPollsHostSettings(eventId: string, view: QuizPollsViewDto) {
    const update = useUpdateQuizPollsSettings(eventId);
    const close = useCloseQuizPolls(eventId);
    // null while nothing is edited, so the fields show what's saved.
    const [draft, setDraft] = useState<Draft | null>(null);
    const [confirmingClose, setConfirmingClose] = useState(false);

    const current = draft ?? seed(view);
    const labelsValid = [current.heLabel, current.sheLabel].every((label) => [...label.trim()].length <= QUIZ_POLLS_SIDE_LABEL_MAX);
    const canSave = draft !== null && labelsValid && !update.isPending;

    function patch(change: Partial<Draft>) {
        setDraft({ ...current, ...change });
    }

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        try {
            await update.mutateAsync({
                closesAt: datetimeLocalValueToIso(current.closesAt),
                heLabel: current.heLabel.trim() || null,
                sheLabel: current.sheLabel.trim() || null,
            });
        } catch {
            return; // update.error shows; keep the draft
        }
        setDraft(null);
    }

    async function confirmClose() {
        try {
            await close.mutateAsync(undefined);
        } catch {
            return; // close.error shows in the modal
        }
        setDraft(null);
        setConfirmingClose(false);
    }

    function askClose() {
        close.reset();
        setConfirmingClose(true);
    }

    return {
        isOpen: view.status === 'OPEN',
        closesAt: current.closesAt,
        heLabel: current.heLabel,
        sheLabel: current.sheLabel,
        canSave,
        isSaving: update.isPending,
        saveError: update.error,
        setClosesAt: (closesAt: string) => patch({ closesAt }),
        setHeLabel: (heLabel: string) => patch({ heLabel }),
        setSheLabel: (sheLabel: string) => patch({ sheLabel }),
        save,
        confirmingClose,
        isClosing: close.isPending,
        closeError: close.error,
        askClose,
        cancelClose: () => setConfirmingClose(false),
        confirmClose,
    };
}
