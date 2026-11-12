'use client';

import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';

import type { useEmailCode } from '@/hooks/useEmailCode';

// The change-email form: starts from the account's email; a saved change goes back to the code screen.
export function useCreateEventWizardChangeEmail(emailCode: ReturnType<typeof useEmailCode>, onDone: () => void) {
    const [email, setEmail] = useState(emailCode.email);
    const { changeEmail } = emailCode;

    const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
    }, []);

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (await changeEmail(email.trim())) onDone();
        },
        [changeEmail, email, onDone],
    );

    return { email, handleEmailChange, handleSubmit };
}
