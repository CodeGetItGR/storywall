'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useSetEventStorageGrant } from '@/hooks/useAdminEvents';
import { bytesToGb, gbToBytes, isGrantReasonValid, isStorageGrantBelowUsage, storageLimitWithGrant } from '@/lib/adminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';

// The free storage is entered as a total in GB; the limit it would leave is shown before saving.
export function useStorageGrantForm(event: AdminEventDetailDto, onDoneAction: () => void) {
    const [gb, setGb] = useState(() => String(bytesToGb(event.usage.grantedStorageBytes)));
    const [reason, setReason] = useState('');
    const mutation = useSetEventStorageGrant(event.id);

    const grantedBytes = gbToBytes(gb);
    const resultLimit = grantedBytes === null ? null : storageLimitWithGrant(event.usage, grantedBytes);
    const belowUsage = grantedBytes !== null && isStorageGrantBelowUsage(event.usage, grantedBytes);
    const reasonValid = isGrantReasonValid(reason);
    const canSave = grantedBytes !== null && !belowUsage && reasonValid && !mutation.isPending;

    function handleGbChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        setGb(changeEvent.currentTarget.value);
    }

    function handleReasonChange(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setReason(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave || grantedBytes === null) return;
        mutation.mutate({ grantedStorageBytes: grantedBytes, reason: reason.trim() }, { onSuccess: onDoneAction });
    }

    return {
        gb,
        handleGbChange,
        reason,
        handleReasonChange,
        gbInvalid: gb.trim() !== '' && grantedBytes === null,
        reasonInvalid: reason.length > 0 && !reasonValid,
        resultLimit,
        belowUsage,
        canSave,
        handleSubmit,
        isSaving: mutation.isPending,
        error: mutation.error,
    };
}
