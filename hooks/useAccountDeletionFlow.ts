'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getRetryAfterSeconds, isRateLimitedError } from '@/lib/api/errors';
import type { AccountDeletionBlockingEvent,AccountDeletionConfirmRequestDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';

const CODE_DIGITS = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type AccountDeletionStep = 'send' | 'verify';

// 409 ACCOUNT_DELETE_HAS_HOSTED_EVENTS carries details.events: [{eventId, title}].
function blockingEventsOf(error: unknown): AccountDeletionBlockingEvent[] | null {
    if (getErrorCode(error) !== ERROR_CODES.ACCOUNT_DELETE_HAS_HOSTED_EVENTS || !(error instanceof ApiError)) return null;
    const details = error.problem?.details as { events?: unknown } | undefined;
    if (!Array.isArray(details?.events)) return [];
    return details.events.filter(
        (event): event is AccountDeletionBlockingEvent =>
            typeof event === 'object' && event !== null && typeof event.eventId === 'string' && typeof event.title === 'string',
    );
}

// Send-code → enter-code flow for POST /api/me/deletion-requests, modelled on
// useEventDeletionFlow. On success the account is locked server-side, so the
// session is cleared here and the user lands on the login page.
export function useAccountDeletionFlow() {
    const router = useRouter();
    const { logout } = useAuth();
    const t = useTranslations('ProfilePage.deleteAccount.otp');
    const toErrorMessage = useApiErrorMessage();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [step, setStep] = useState<AccountDeletionStep>('send');
    const [otpCode, setOtpCode] = useState('');
    const [otpInvalid, setOtpInvalid] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [blockingEvents, setBlockingEvents] = useState<AccountDeletionBlockingEvent[] | null>(null);
    const [resendSeconds, setResendSeconds] = useState(0);

    const requestOtp = useMutation({ mutationFn: () => api.post<void>(endpoints.me.deletionRequestOtp) });
    const confirmDeletion = useMutation({
        mutationFn: (input: AccountDeletionConfirmRequestDto) => api.post<void>(endpoints.me.deletionRequests, input),
    });
    const isPending = requestOtp.isPending || confirmDeletion.isPending;

    useEffect(() => {
        if (resendSeconds <= 0) return;
        const timer = setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendSeconds]);

    function clearFeedback() {
        setOtpInvalid(false);
        setDeleteError(null);
        setBlockingEvents(null);
    }

    function openConfirm() {
        setOtpCode('');
        clearFeedback();
        requestOtp.reset();
        confirmDeletion.reset();
        // Step and resend cooldown survive a close/reopen, as in useEventDeletionFlow.
        setConfirmOpen(true);
    }

    function closeConfirm() {
        if (isPending) return;
        setOtpCode('');
        clearFeedback();
        setConfirmOpen(false);
    }

    function handleOtpChange(event: ChangeEvent<HTMLInputElement>) {
        setOtpCode(event.target.value.replace(/\D/g, '').slice(0, CODE_DIGITS));
        setOtpInvalid(false);
        setDeleteError(null);
    }

    function backToSend(message: string | null) {
        setStep('send');
        setOtpCode('');
        setResendSeconds(0);
        setDeleteError(message);
    }

    // Shared by both calls: the server re-checks eligibility on confirm too.
    function handleBlocked(error: unknown): boolean {
        const events = blockingEventsOf(error);
        if (events === null) return false;
        backToSend(null);
        setBlockingEvents(events);
        return true;
    }

    async function sendOtp() {
        if (requestOtp.isPending || resendSeconds > 0) return;
        clearFeedback();
        try {
            await requestOtp.mutateAsync();
            setOtpCode('');
            setStep('verify');
            setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS);
        } catch (error) {
            if (handleBlocked(error)) return;
            if (isRateLimitedError(error)) {
                setResendSeconds(getRetryAfterSeconds(error) ?? OTP_RESEND_COOLDOWN_SECONDS);
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    async function confirmDelete() {
        if (otpCode.length !== CODE_DIGITS) return;
        clearFeedback();
        try {
            await confirmDeletion.mutateAsync({ otpCode });
        } catch (error) {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.ACCOUNT_DELETE_OTP_INVALID) {
                setOtpInvalid(true);
                return;
            }
            if (handleBlocked(error)) return;
            if (code === ERROR_CODES.ACCOUNT_DELETE_OTP_NOT_REQUESTED) return backToSend(t('errors.notRequested'));
            if (code === ERROR_CODES.ACCOUNT_DELETE_OTP_EXPIRED) return backToSend(t('errors.expired'));
            if (code === ERROR_CODES.ACCOUNT_DELETE_OTP_TOO_MANY_ATTEMPTS) return backToSend(t('errors.tooManyAttempts'));
            setDeleteError(toErrorMessage(error));
            return;
        }
        setConfirmOpen(false);
        await logout();
        router.replace(routes.auth.login({ accountDeleted: '1' }));
    }

    return {
        confirmOpen,
        step,
        openConfirm,
        closeConfirm,
        otpCode,
        codeDigits: CODE_DIGITS,
        handleOtpChange,
        otpInvalid,
        deleteError,
        blockingEvents,
        sendOtp,
        confirmDelete,
        resendSeconds,
        isSendingCode: requestOtp.isPending,
        isDeleting: confirmDeletion.isPending,
    };
}
