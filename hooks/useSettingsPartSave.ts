'use client';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdateEvent } from '@/hooks/useEvent';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventPatchDto } from '@/lib/api/types';

// Saves one Settings part: only the fields its editor changed, then closes it (onSaved).
// Each editor has its own instance, so one part's error never shows on another.
export function useSettingsPartSave(eventId: string, onSaved: () => void) {
    const updateEvent = useUpdateEvent(eventId);
    const toErrorMessage = useApiErrorMessage();
    const fieldErrors = getFieldErrors(updateEvent.error);

    async function save(patch: EventPatchDto) {
        if (Object.keys(patch).length === 0) {
            onSaved();
            return;
        }
        try {
            await updateEvent.mutateAsync(patch);
            onSaved();
        } catch {
            // Shown in the editor (errorMessage / fieldErrors).
        }
    }

    // An editor holds one part's few fields, so the server's message for a field shows under the
    // form like any other error.
    const fieldMessage = fieldErrors ? Object.values(fieldErrors)[0] : undefined;

    return {
        save,
        isSaving: updateEvent.isPending,
        errorMessage: updateEvent.isError ? (fieldMessage ?? toErrorMessage(updateEvent.error)) : null,
    };
}
