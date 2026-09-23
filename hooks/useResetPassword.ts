'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

export function useResetPassword() {
    const t = useTranslations('ResetPasswordPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const toErrorMessage = useApiErrorMessage();
    const token = searchParams.get('token')?.trim() ?? '';
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const updatePassword = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    }, []);

    const updateConfirmation = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmation(event.target.value);
    }, []);

    const togglePasswordVisibility = useCallback(() => {
        setShowPassword((value) => !value);
    }, []);

    const submit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!token) return;

            if (password !== confirmation) {
                setError(t('passwordMismatch'));
                return;
            }

            setError(null);
            setIsSubmitting(true);

            try {
                await api.post<void>(endpoints.auth.resetPassword, { token, newPassword: password });
                router.replace(routes.auth.login({ passwordChanged: '1' }));
            } catch (requestError) {
                setError(getErrorCode(requestError) === ERROR_CODES.VALIDATION_FAILED ? t('invalidLink') : toErrorMessage(requestError));
            } finally {
                setIsSubmitting(false);
            }
        },
        [confirmation, password, router, t, toErrorMessage, token],
    );

    return {
        confirmation,
        error,
        hasToken: Boolean(token),
        isSubmitting,
        password,
        showPassword,
        submit,
        togglePasswordVisibility,
        updateConfirmation,
        updatePassword,
    };
}
