'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isRateLimitedError } from '@/lib/api/errors';

export type EmailVerificationState = 'error' | 'missing-token' | 'pending' | 'verified';

export function useVerifyEmail() {
    const t = useTranslations('VerifyEmailPage');
    const toErrorMessage = useApiErrorMessage();
    const searchParams = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';
    const [state, setState] = useState<EmailVerificationState>('pending');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // The link is single-use: a second submit of the same token (the effect
    // re-running, a remount) is answered "already used". Send it once, and
    // never let a late failure replace a verification that went through.
    const submittedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!token || submittedTokenRef.current === token) return;
        submittedTokenRef.current = token;

        void api.post<void>(endpoints.auth.verifyEmail, { token }).then(
            () => setState('verified'),
            (error: unknown) => {
                setErrorMessage(isRateLimitedError(error) ? toErrorMessage(error) : t('invalidDescription'));
                setState((current) => (current === 'verified' ? current : 'error'));
            },
        );
    }, [t, toErrorMessage, token]);

    return { errorMessage, state: token ? state : 'missing-token' };
}
