'use client';

import { useState } from 'react';

import { useDeleteGiftAccount, useSaveGiftAccount } from '@/hooks/useGiftAccount';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import { giftAccountInputFromForm } from '@/lib/giftAccount';

export function useGiftAccountEditor(eventId: string) {
    const save = useSaveGiftAccount(eventId);
    const remove = useDeleteGiftAccount(eventId);
    const [isEditing, setIsEditing] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const invalidIban = getErrorCode(save.error) === ERROR_CODES.INVALID_IBAN || Boolean(getFieldErrors(save.error)?.iban);

    function startEditing() {
        setIsEditing(true);
    }

    function stopEditing() {
        save.reset();
        setIsEditing(false);
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        try {
            await save.mutateAsync(giftAccountInputFromForm(event.currentTarget));
            setIsEditing(false);
        } catch {
            // Save errors stay on the mutation state.
        }
    }

    function openRemove() {
        setRemoveOpen(true);
    }

    function closeRemove() {
        setRemoveOpen(false);
    }

    async function confirmRemove() {
        await remove.mutateAsync();
        setRemoveOpen(false);
        setIsEditing(false);
    }

    return {
        isEditing,
        startEditing,
        stopEditing,
        submit,
        isSaving: save.isPending,
        invalidIban,
        removeOpen,
        openRemove,
        closeRemove,
        confirmRemove,
        isRemoving: remove.isPending,
    };
}
