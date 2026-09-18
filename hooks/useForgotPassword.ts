'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuthPageRedirect } from '@/hooks/useAuthPageRedirect';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export function useForgotPassword() {
    const t = useTranslations('ForgotPasswordPage');
    const toErrorMessage = useApiErrorMessage();
    const { shouldRenderAuthPage } = useAuthPageRedirect();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const updateEmail = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
    }, []);

    const submit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);
            setIsSubmitting(true);

            try {
                await api.post<void>(endpoints.auth.forgotPassword, { email });
                setIsSubmitted(true);
            } catch (requestError) {
                setError(toErrorMessage(requestError, t('requestFailed')));
            } finally {
                setIsSubmitting(false);
            }
        },
        [email, t, toErrorMessage]
    );

    return { email, error, isSubmitted, isSubmitting, shouldRenderAuthPage, submit, updateEmail };
}
