'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useGrantEventModule } from '@/hooks/useAdminEvents';
import { isGrantReasonValid } from '@/lib/adminEvents';

export function useModuleGrantForm(eventId: string, moduleKey: string, onDoneAction: () => void) {
    const [reason, setReason] = useState('');
    const mutation = useGrantEventModule(eventId);
    const reasonValid = isGrantReasonValid(reason);
    const canSave = reasonValid && !mutation.isPending;

    function handleReasonChange(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setReason(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave) return;
        mutation.mutate({ moduleKey, reason: reason.trim() }, { onSuccess: onDoneAction });
    }

    return {
        reason,
        handleReasonChange,
        reasonInvalid: reason.length > 0 && !reasonValid,
        canSave,
        handleSubmit,
        isSaving: mutation.isPending,
        error: mutation.error,
    };
}
