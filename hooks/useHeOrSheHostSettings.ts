'use client';

import { type SubmitEvent, useState } from 'react';

import { useUpdateHeOrSheSettings } from '@/hooks/useHeOrShe';
import type { HeOrSheViewDto } from '@/lib/api/types';
import { datetimeLocalValueToIso, toDatetimeLocalValue } from '@/lib/datetime';

/** When voting closes. Empty keeps voting open. */
export function useHeOrSheHostSettings(eventId: string, view: HeOrSheViewDto) {
    const update = useUpdateHeOrSheSettings(eventId);
    // A datetime-local value, '' for none; null while nothing is edited.
    const [draft, setDraft] = useState<string | null>(null);

    const locked = view.status === 'CLOSED';
    const closesAt = draft ?? toDatetimeLocalValue(view.closesAt);
    const canSave = draft !== null && !update.isPending && !locked;

    async function save(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        try {
            await update.mutateAsync({ closesAt: datetimeLocalValueToIso(closesAt) });
        } catch {
            return; // update.error shows; keep the draft
        }
        setDraft(null);
    }

    return {
        locked,
        closesAt,
        canSave,
        isSaving: update.isPending,
        saveError: update.error,
        setClosesAt: setDraft,
        save,
    };
}
