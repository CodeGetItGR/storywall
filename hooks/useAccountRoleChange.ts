'use client';

import { useCallback, useState } from 'react';

import { useUpdateAdminAccountMutation } from '@/hooks/useAdminAccounts';
import type { TeamRole } from '@/lib/accountRole';
import type { UserResponseDto } from '@/lib/api/types';

/**
 * Switches an account between User and Marketing from the account drawer. Each switch
 * asks in a confirmation dialog first; the updated account is handed back for the drawer
 * to show, and the accounts list refreshes through the mutation.
 */
export function useAccountRoleChange({
    account,
    onChangedAction,
}: {
    account: UserResponseDto;
    onChangedAction: (account: UserResponseDto) => void;
}) {
    const { mutateAsync: updateAccount, isPending, error, reset } = useUpdateAdminAccountMutation();
    const [requestedRole, setRequestedRole] = useState<TeamRole | null>(null);
    const [saved, setSaved] = useState(false);

    const handleRoleRequest = useCallback(
        (role: TeamRole) => {
            if (role === account.platformRole) return;
            reset();
            setSaved(false);
            setRequestedRole(role);
        },
        [account.platformRole, reset],
    );

    const handleCloseConfirmation = useCallback(() => {
        if (!isPending) setRequestedRole(null);
    }, [isPending]);

    const handleConfirm = useCallback(async () => {
        if (!requestedRole) return;
        try {
            const updated = await updateAccount({ id: account.id, input: { platformRole: requestedRole } });
            setSaved(true);
            onChangedAction(updated);
        } catch {
            // The mutation keeps the error; the section shows it under the control.
        } finally {
            setRequestedRole(null);
        }
    }, [account.id, onChangedAction, requestedRole, updateAccount]);

    return { requestedRole, saved, isPending, error, handleRoleRequest, handleCloseConfirmation, handleConfirm };
}
