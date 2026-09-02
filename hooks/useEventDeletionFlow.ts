'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useRefundEligibility } from '@/hooks/useBilling';
import { eventKeys } from '@/hooks/useEvent';
import { useCancelEventDeletion, useRequestEventDeletion } from '@/hooks/useEventDeletion';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

// Mirrors useProfileForm's password-confirmation shape: local state for the
// confirm modal, the password field, and the two error surfaces (a
// wrong-password field error vs. every other failure as a banner message).
export function useEventDeletionFlow(eventId: string) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordInvalid, setPasswordInvalid] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const refundEligibility = useRefundEligibility(eventId);
    const requestDeletion = useRequestEventDeletion(eventId);
    const cancelDeletion = useCancelEventDeletion(eventId);

    function openConfirm() {
        setPassword('');
        setPasswordInvalid(false);
        setDeleteError(null);
        setConfirmOpen(true);
    }

    function closeConfirm() {
        if (requestDeletion.isPending) return;
        setConfirmOpen(false);
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.target.value);
        setPasswordInvalid(false);
    }

    async function confirmDelete() {
        setPasswordInvalid(false);
        setDeleteError(null);

        try {
            await requestDeletion.mutateAsync({ currentPassword: password });
            setConfirmOpen(false);
        } catch (error) {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.INVALID_CREDENTIALS) {
                setPasswordInvalid(true);
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_ALREADY_PENDING) {
                // Someone else (or a stale tab) already requested deletion —
                // refetch so the pending-deletion banner takes over instead
                // of leaving the confirm modal open on a dead request.
                setConfirmOpen(false);
                queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
                return;
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    async function undoDeletion() {
        await cancelDeletion.mutateAsync();
    }

    return {
        confirmOpen,
        openConfirm,
        closeConfirm,
        password,
        handlePasswordChange,
        passwordInvalid,
        deleteError,
        confirmDelete,
        isDeleting: requestDeletion.isPending,
        undoDeletion,
        isUndoing: cancelDeletion.isPending,
        isRefundEligible: Boolean(refundEligibility.data?.eligible),
    };
}
