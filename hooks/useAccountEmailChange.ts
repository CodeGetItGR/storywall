'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import { useUpdateAdminAccountMutation } from '@/hooks/useAdminAccounts';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { accountEmailChange, accountEmailChangeErrorKey } from '@/lib/adminAccountProvisioning';
import type { UserResponseDto } from '@/lib/api/types';

/**
 * The account drawer's email change. The server unverifies the account when the
 * email changes, so the updated account is handed back for the drawer to show.
 */
export function useAccountEmailChange({
    account,
    onChangedAction,
}: {
    account: UserResponseDto;
    onChangedAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts.email');
    const toErrorMessage = useApiErrorMessage();
    const updateAccount = useUpdateAdminAccountMutation();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState(account.email ?? '');
    const [error, setError] = useState<string | null>(null);

    const change = accountEmailChange(account.email, email);

    function start() {
        setEmail(account.email ?? '');
        setError(null);
        setOpen(true);
    }

    function cancel() {
        if (!updateAccount.isPending) setOpen(false);
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.target.value);
        setError(null);
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!change) return;
        setError(null);
        try {
            const updated = await updateAccount.mutateAsync({ id: account.id, input: change });
            setOpen(false);
            onChangedAction(updated);
        } catch (changeError) {
            const key = accountEmailChangeErrorKey(changeError);
            setError(key ? t(key) : toErrorMessage(changeError));
        }
    }

    return {
        open,
        email,
        error,
        canSave: Boolean(change) && !updateAccount.isPending,
        isSaving: updateAccount.isPending,
        start,
        cancel,
        handleChange,
        submit,
    };
}

export type AccountEmailChange = ReturnType<typeof useAccountEmailChange>;
