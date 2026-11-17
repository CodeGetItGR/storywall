'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { meQueryKey } from '@/hooks/useMe';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { type EmailCodeError, emailCodeError, onlyDigits, readCodeSentAt, rememberCodeSentAt } from '@/lib/emailCode';

// The code screen: the six digits, verify, resend with its countdown, and change email.
export function useEmailCode() {
    const { user } = useAuth();
    const userId = user?.userId ?? null;
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const [code, setCodeValue] = useState('');
    const [sentAt, setSentAt] = useState<number | null>(() => (userId ? readCodeSentAt(userId) : null));
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [resent, setResent] = useState(false);
    const [errorKey, setErrorKey] = useState<EmailCodeError | null>(null);
    const [error, setError] = useState<string | null>(null);
    const secondsLeft = useSecondsLeft(sentAt);

    const markSent = useCallback(() => {
        if (!userId) return;
        const at = Date.now();
        rememberCodeSentAt(userId, at);
        setSentAt(at);
    }, [userId]);

    const refreshAccount = useCallback(() => queryClient.invalidateQueries({ queryKey: meQueryKey }), [queryClient]);

    const failWith = useCallback(
        (err: unknown) => {
            const key = emailCodeError(err);
            setErrorKey(key);
            setError(key ? null : toErrorMessage(err));
        },
        [toErrorMessage],
    );

    const resend = useCallback(async () => {
        setIsSending(true);
        setErrorKey(null);
        setError(null);
        try {
            await api.post(endpoints.auth.emailCode.send);
            markSent();
            setResent(true);
        } catch (err) {
            failWith(err);
        } finally {
            setIsSending(false);
        }
    }, [failWith, markSent]);

    // A first code, once, when none went to this account in this tab (sign-up already sent one).
    // A 429 means one was just sent, so only the wait starts.
    const firstSendDone = useRef(false);
    useEffect(() => {
        if (!userId || firstSendDone.current) return;
        firstSendDone.current = true;
        if (readCodeSentAt(userId) !== null) return;
        api.post(endpoints.auth.emailCode.send).then(markSent, (err: unknown) => {
            if (err instanceof ApiError && err.status === 429) markSent();
            else failWith(err);
        });
    }, [failWith, markSent, userId]);

    const verify = useCallback(
        async (value: string) => {
            setIsVerifying(true);
            setErrorKey(null);
            setError(null);
            try {
                await api.post(endpoints.auth.emailCode.verify, { code: value });
                await refreshAccount();
            } catch (err) {
                if (getErrorCode(err) === ERROR_CODES.EMAIL_ALREADY_VERIFIED) {
                    await refreshAccount();
                    return;
                }
                failWith(err);
                setCodeValue('');
            } finally {
                setIsVerifying(false);
            }
        },
        [failWith, refreshAccount],
    );

    const changeEmail = useCallback(
        async (email: string): Promise<boolean> => {
            setIsSending(true);
            setErrorKey(null);
            setError(null);
            try {
                await api.put(endpoints.auth.emailCode.email, { email });
                markSent();
                setResent(false);
                await refreshAccount();
                return true;
            } catch (err) {
                failWith(err);
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [failWith, markSent, refreshAccount],
    );

    const setCode = useCallback((value: string) => {
        setCodeValue(onlyDigits(value));
        setErrorKey(null);
        setError(null);
    }, []);

    return {
        email: user?.email ?? '',
        code,
        setCode,
        verify,
        resend,
        changeEmail,
        secondsLeft,
        resent,
        isVerifying,
        isSending,
        errorKey,
        error,
    };
}
