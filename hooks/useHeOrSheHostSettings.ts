'use client';

import { type SubmitEvent, useState } from 'react';

import { useRevealHeOrShe, useUpdateHeOrSheSettings } from '@/hooks/useHeOrShe';
import type { HeOrSheValue, HeOrSheViewDto } from '@/lib/api/types';
import { datetimeLocalValueToIso, toDatetimeLocalValue } from '@/lib/datetime';

interface Draft {
    answer: HeOrSheValue | null;
    // A datetime-local value, '' for none.
    revealAt: string;
}

/** The host's secret answer and reveal time, and the reveal itself. */
export function useHeOrSheHostSettings(eventId: string, view: HeOrSheViewDto) {
    const update = useUpdateHeOrSheSettings(eventId);
    const reveal = useRevealHeOrShe(eventId);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [revealOpen, setRevealOpen] = useState(false);
    const [revealAnswer, setRevealAnswer] = useState<HeOrSheValue | null>(null);

    const locked = view.status === 'REVEALED';
    const current = draft ?? { answer: view.answer, revealAt: toDatetimeLocalValue(view.revealAt) };
    // A scheduled reveal needs the answer; the server refuses it otherwise (5171).
    const needsAnswer = current.revealAt !== '' && current.answer === null;
    const canSave = draft !== null && !needsAnswer && !update.isPending && !locked;

    function setAnswer(answer: HeOrSheValue) {
        setDraft({ ...current, answer });
    }

    function setRevealAt(revealAt: string) {
        setDraft({ ...current, revealAt });
    }

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        try {
            await update.mutateAsync({ answer: current.answer, revealAt: datetimeLocalValueToIso(current.revealAt) });
        } catch {
            return; // update.error shows; keep the draft
        }
        setDraft(null);
    }

    function openReveal() {
        reveal.reset();
        setRevealAnswer(view.answer);
        setRevealOpen(true);
    }

    function closeReveal() {
        setRevealOpen(false);
    }

    async function confirmReveal() {
        if (revealAnswer === null) return;
        try {
            await reveal.mutateAsync(revealAnswer);
        } catch {
            return; // reveal.error shows in the modal
        }
        setDraft(null);
        setRevealOpen(false);
    }

    return {
        locked,
        answer: current.answer,
        revealAt: current.revealAt,
        needsAnswer,
        canSave,
        isSaving: update.isPending,
        saveError: update.error,
        setAnswer,
        setRevealAt,
        save,
        reveal: {
            open: revealOpen,
            answer: revealAnswer,
            setAnswer: setRevealAnswer,
            isRevealing: reveal.isPending,
            error: reveal.error,
            openReveal,
            close: closeReveal,
            confirm: confirmReveal,
        },
    };
}
