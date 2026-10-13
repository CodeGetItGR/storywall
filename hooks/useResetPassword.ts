'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

// 3059 names the bad link; older backends answer the generic 3001.
function isInvalidResetLink(error: unknown): boolean {
    const code = getErrorCode(error);
    return code === ERROR_CODES.PASSWORD_RESET_LINK_INVALID || code === ERROR_CODES.VALIDATION_FAILED;
}

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
    // The link is single-use, so a second submit after the first went through is
    // answered "invalid link". One request at a time, and none after success.
    const inFlightRef = useRef(false);

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
            if (!token || inFlightRef.current) return;

            if (password !== confirmation) {
                setError(t('passwordMismatch'));
                return;
            }

            setError(null);
            setIsSubmitting(true);
            inFlightRef.current = true;

            try {
                await api.post<void>(endpoints.auth.resetPassword, { token, newPassword: password });
                // Stays submitting (button disabled) until the login page replaces this one.
                router.replace(routes.auth.login({ passwordChanged: '1' }));
            } catch (requestError) {
                inFlightRef.current = false;
                setIsSubmitting(false);
                setError(isInvalidResetLink(requestError) ? t('invalidLink') : toErrorMessage(requestError));
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
