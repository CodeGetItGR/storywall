'use client';

import { useState } from 'react';

import { useUpdateAdminAccountMutation } from '@/hooks/useAdminAccounts';
import type { UserResponseDto } from '@/lib/api/types';

type AccountConfirmation = 'access' | 'suspend' | 'delete' | null;

export function useAccountAdminActions({ account, onCompleteAction }: { account: UserResponseDto; onCompleteAction: () => void }) {
    const updateAccount = useUpdateAdminAccountMutation();
    const [locked, setLocked] = useState(account.eventCreationLocked);
    const [requestedLocked, setRequestedLocked] = useState(account.eventCreationLocked);
    const [confirmation, setConfirmation] = useState<AccountConfirmation>(null);
    const [saved, setSaved] = useState(false);

    function requestAccessChange(nextLocked: boolean) {
        if (nextLocked === locked) return;
        setRequestedLocked(nextLocked);
        setSaved(false);
        setConfirmation('access');
    }

    function requestSuspend() {
        setConfirmation('suspend');
    }

    function requestDelete() {
        setConfirmation('delete');
    }

    function closeConfirmation() {
        if (!updateAccount.isPending) setConfirmation(null);
    }

    async function confirm() {
        if (!confirmation) return;

        try {
            if (confirmation === 'access') {
                await updateAccount.mutateAsync({ id: account.id, input: { eventCreationLocked: requestedLocked } });
                setLocked(requestedLocked);
                setSaved(true);
                setConfirmation(null);
                return;
            }

            await updateAccount.mutateAsync({ id: account.id, input: { status: confirmation === 'suspend' ? 'SUSPENDED' : 'DELETED' } });
            setConfirmation(null);
            onCompleteAction();
        } catch {
            setConfirmation(null);
        }
    }

    return {
        confirmation,
        confirm,
        closeConfirmation,
        locked,
        requestAccessChange,
        requestSuspend,
        requestDelete,
        saved,
        updateAccount,
    };
}
