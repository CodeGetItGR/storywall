'use client';

import { useState } from 'react';

import { useAdminAccounts, useCreateProvisionedAccountMutation } from '@/hooks/useAdminAccounts';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { ApiError } from '@/lib/api/client';

export function useCreateProvisionedAccount() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [conflictEmail, setConflictEmail] = useState('');
    const createAccount = useCreateProvisionedAccountMutation();
    const existingAccountQuery = useAdminAccounts({ page: 0, size: 1, email: conflictEmail, enabled: Boolean(conflictEmail) });
    const toErrorMessage = useApiErrorMessage();

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setConflictEmail('');
        createAccount.reset();
        try {
            await createAccount.mutateAsync({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) setConflictEmail(email.trim());
        }
    }

    return {
        firstName,
        setFirstName,
        lastName,
        setLastName,
        email,
        setEmail,
        submit,
        createdAccount: createAccount.data ?? null,
        existingAccount: existingAccountQuery.data?.content[0] ?? null,
        isExistingAccountLoading: existingAccountQuery.isLoading,
        isPending: createAccount.isPending,
        error: createAccount.error ? toErrorMessage(createAccount.error) : null,
    };
}
