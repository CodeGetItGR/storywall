'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { eventKeys } from '@/hooks/useEvent';
import { useRequestEventDeletion, useRequestEventDeletionOtp } from '@/hooks/useEventDeletion';
import { ERROR_CODES, getErrorCode, getRetryAfterSeconds, isRateLimitedError } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type EventDeletionStep = 'send' | 'verify';

export function useEventDeletionFlow(eventId: string) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const t = useTranslations('ManagePage.settings.dangerZone.otp');
    const toErrorMessage = useApiErrorMessage();

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

    function handleOtpChange(event: ChangeEvent<HTMLInputElement>) {
        setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
        setOtpInvalid(false);
        setDeleteError(null);
    }

    function handleAlreadyPending() {
        setConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    }

    async function sendOtp() {
        if (requestOtp.isPending || resendSeconds > 0) return;
        setOtpInvalid(false);
        setDeleteError(null);

        try {
            await requestOtp.mutateAsync();
            setOtpCode('');
            setStep('verify');
            setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS);
        } catch (error) {
            if (getErrorCode(error) === ERROR_CODES.EVENT_DELETE_ALREADY_PENDING) {
                handleAlreadyPending();
                return;
            }
            if (isRateLimitedError(error)) {
                setResendSeconds(getRetryAfterSeconds(error) ?? OTP_RESEND_COOLDOWN_SECONDS);
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    async function confirmDelete() {
        if (!/^\d{6}$/.test(otpCode)) return;
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
                setStep('send');
                setOtpCode('');
                setResendSeconds(0);
                setDeleteError(t('errors.notRequested'));
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_OTP_EXPIRED) {
                setStep('send');
                setOtpCode('');
                setResendSeconds(0);
                setDeleteError(t('errors.expired'));
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS) {
                setStep('send');
                setOtpCode('');
                setResendSeconds(0);
                setDeleteError(t('errors.tooManyAttempts'));
                return;
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    return {
        confirmOpen,
        step,
        openConfirm,
        closeConfirm,
        otpCode,
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
