'use client';

import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';

import { useUpdateOutreachProspect } from '@/hooks/useAdminOutreach';
import { nextOutreachStatus, type ProgressDraft, progressPatch, toProgressDraft } from '@/lib/adminOutreach';
import type { OutreachProspectDto, OutreachStatus } from '@/lib/api/types';

type ProgressField = keyof ProgressDraft;

// Status, dates, contact person and outcome of one business. The owner keys this on the
// business's updatedAt, so a save (which can move the follow-up date) starts it fresh.
export function useOutreachProgressForm(prospect: OutreachProspectDto) {
    const update = useUpdateOutreachProspect();
    const [draft, setDraft] = useState<ProgressDraft>(() => toProgressDraft(prospect));
    const patch = useMemo(() => progressPatch(prospect, draft), [draft, prospect]);
    const isDirty = Object.keys(patch).length > 0;
    const nextStatus = nextOutreachStatus(prospect.status);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const field = event.currentTarget.name as ProgressField;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [field]: field === 'status' ? (value as OutreachStatus) : value }));
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!isDirty) return;
            update.mutate({ id: prospect.id, patch });
        },
        [isDirty, patch, prospect.id, update],
    );

    const handleReset = useCallback(() => setDraft(toProgressDraft(prospect)), [prospect]);

    // The one-click step: moves the status only, so the server sets the dates.
    const handleNextStep = useCallback(() => {
        if (nextStatus) update.mutate({ id: prospect.id, patch: { status: nextStatus } });
    }, [nextStatus, prospect.id, update]);

    return {
        draft,
        isDirty,
        nextStatus,
        isSaving: update.isPending,
        error: update.error,
        handleChange,
        handleSubmit,
        handleReset,
        handleNextStep,
    };
}

export type OutreachProgressFormState = ReturnType<typeof useOutreachProgressForm>;
