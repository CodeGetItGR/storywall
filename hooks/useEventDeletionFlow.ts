'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { eventKeys } from '@/hooks/useEvent';
import { useRequestEventDeletion, useRequestEventDeletionOtp } from '@/hooks/useEventDeletion';
import { ERROR_CODES, getErrorCode, getRetryAfterSeconds, isRateLimitedError } from '@/lib/api/errors';
import { DEFAULT_EVENT_DELETION } from '@/lib/appConfigDefaults';
import { onlyDigits } from '@/lib/emailCode';
import { routes } from '@/lib/routes';

const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type EventDeletionStep = 'send' | 'verify';

type EventDeletionFlowOptions = {
    // The page itself says what deleting does, so the sheet opens on the code step:
    // startDeletion sends the code first, and code errors stay on the code step.
    codeFirst?: boolean;
};

export function useEventDeletionFlow(eventId: string, { codeFirst = false }: EventDeletionFlowOptions = {}) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const t = useTranslations('ManagePage.settings.dangerZone.otp');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const codeDigits = appConfig?.eventDeletion?.codeDigits ?? DEFAULT_EVENT_DELETION.codeDigits;

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [step, setStep] = useState<EventDeletionStep>('send');
    const [otpCode, setOtpCode] = useState('');
    const [otpInvalid, setOtpInvalid] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [resendSeconds, setResendSeconds] = useState(0);

    const requestOtp = useRequestEventDeletionOtp(eventId);
    const requestDeletion = useRequestEventDeletion(eventId);
    const isPending = requestOtp.isPending || requestDeletion.isPending;

    useEffect(() => {
        if (resendSeconds <= 0) return;
        const timer = setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendSeconds]);

    function resetFeedback() {
        setOtpCode('');
        setOtpInvalid(false);
        setDeleteError(null);
        requestOtp.reset();
        requestDeletion.reset();
    }

    function openConfirm() {
        resetFeedback();
        setConfirmOpen(true);
    }

    function closeConfirm() {
        if (isPending) return;
        setOtpCode('');
        setOtpInvalid(false);
        setDeleteError(null);
        setConfirmOpen(false);
    }

    function handleOtpChange(value: string) {
        setOtpCode(onlyDigits(value, codeDigits));
        setOtpInvalid(false);
        setDeleteError(null);
    }

    function handleAlreadyPending() {
        setConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    }

    async function sendOtp(): Promise<boolean> {
        if (requestOtp.isPending || resendSeconds > 0) return false;
        setOtpInvalid(false);
        setDeleteError(null);

        try {
            await requestOtp.mutateAsync();
            setOtpCode('');
            setStep('verify');
            setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS);
            return true;
        } catch (error) {
            if (getErrorCode(error) === ERROR_CODES.EVENT_DELETE_ALREADY_PENDING) {
                handleAlreadyPending();
                return false;
            }
            if (isRateLimitedError(error)) {
                setResendSeconds(getRetryAfterSeconds(error) ?? OTP_RESEND_COOLDOWN_SECONDS);
            }
            setDeleteError(toErrorMessage(error));
            return false;
        }
    }

    // Code-first flow: a code already sent reopens its step; otherwise send one
    // and open the sheet only once it is on its way. A failed send keeps the
    // sheet closed and leaves its error for the page.
    async function startDeletion() {
        if (isPending) return;
        if (step === 'verify') {
            openConfirm();
            return;
        }
        resetFeedback();
        if (await sendOtp()) setConfirmOpen(true);
    }

    // A code that can no longer be used: the plain flow goes back to its warning
    // step, the code-first flow stays on the code step with a new code ready.
    function restartCode(message: string) {
        if (!codeFirst) setStep('send');
        setOtpCode('');
        setResendSeconds(0);
        setDeleteError(message);
    }

    async function confirmDelete() {
        if (otpCode.length !== codeDigits) return;
        setOtpInvalid(false);
        setDeleteError(null);

        try {
            await requestDeletion.mutateAsync({ otpCode });
            setConfirmOpen(false);
            router.replace(routes.home);
        } catch (error) {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.EVENT_DELETE_OTP_INVALID) {
                setOtpInvalid(true);
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_ALREADY_PENDING) {
                handleAlreadyPending();
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_OTP_NOT_REQUESTED) {
                restartCode(t('errors.notRequested'));
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_OTP_EXPIRED) {
                restartCode(t('errors.expired'));
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS) {
                restartCode(t('errors.tooManyAttempts'));
                return;
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    return {
        confirmOpen,
        step,
        openConfirm,
        startDeletion,
        closeConfirm,
        otpCode,
        codeDigits,
        handleOtpChange,
        otpInvalid,
        deleteError,
        sendOtp,
        confirmDelete,
        resendSeconds,
        isSendingCode: requestOtp.isPending,
        isDeleting: requestDeletion.isPending,
    };
}
