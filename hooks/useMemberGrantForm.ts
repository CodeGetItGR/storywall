'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useSetEventMemberSlots } from '@/hooks/useAdminEvents';
import { isGrantReasonValid, memberLimitWithSlots, parseMemberSlots } from '@/lib/adminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';

// Extra member slots are a total on top of the plan; the limit they would leave is shown before saving.
export function useMemberGrantForm(event: AdminEventDetailDto, onDoneAction: () => void) {
    const [slots, setSlots] = useState(() => String(event.usage.extraMemberSlots));
    const [reason, setReason] = useState('');
    const mutation = useSetEventMemberSlots(event.id);

    const parsedSlots = parseMemberSlots(slots);
    const reasonValid = isGrantReasonValid(reason);
    const canSave = parsedSlots !== null && reasonValid && !mutation.isPending;

    function handleSlotsChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        setSlots(changeEvent.currentTarget.value);
    }

    function handleReasonChange(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setReason(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave || parsedSlots === null) return;
        mutation.mutate({ extraMemberSlots: parsedSlots, reason: reason.trim() }, { onSuccess: onDoneAction });
    }

    return {
        slots,
        handleSlotsChange,
        reason,
        handleReasonChange,
        slotsInvalid: slots.trim() !== '' && parsedSlots === null,
        reasonInvalid: reason.length > 0 && !reasonValid,
        resultLimit: parsedSlots === null ? null : memberLimitWithSlots(event.usage, parsedSlots),
        canSave,
        handleSubmit,
        isSaving: mutation.isPending,
        error: mutation.error,
    };
}
