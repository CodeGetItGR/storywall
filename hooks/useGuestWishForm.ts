'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { communityGuidelinesQueryKey, useCommunityGuidelinesVersion } from '@/hooks/useCommunityGuidelinesVersion';
import { useSendQrWish } from '@/hooks/useQrWish';
import { termsVersionQueryKey, useTermsVersion } from '@/hooks/useTermsVersion';
import {
    ERROR_CODES,
    getErrorCode,
    getFieldErrors,
    isGuidelinesVersionMismatchError,
    isRateLimitedError,
    isTermsVersionMismatchError,
} from '@/lib/api/errors';
import { INCIDENT_MODE } from '@/lib/incident';

export const GUEST_WISH_NAME_MAX_LENGTH = 120;

// State, submit and error mapping for the wish form on a guest code. No account: the 16+ confirmation
// and the Terms / Guidelines acceptance are asked on every wish, in one box, like the anonymous upload form.
export function useGuestWishForm(token: string) {
    const t = useTranslations('QrCodePage');
    const toErrorMessage = useApiErrorMessage();
    const sendWish = useSendQrWish();
    const queryClient = useQueryClient();
    const termsVersion = useTermsVersion();
    const guidelinesVersion = useCommunityGuidelinesVersion();
    const { data: appConfig } = useAppConfig();
    const maxMessageLength = appConfig?.contentLimits.wishbookMessageMaxLength ?? 2000;

    const [guestName, setGuestName] = useState('');
    const [message, setMessage] = useState('');
    const [acceptedDocuments, setAcceptedDocuments] = useState(false);
    const [sent, setSent] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const isPending = sendWish.isPending;
    const canSubmit = !INCIDENT_MODE && !isPending && guestName.trim() !== '' && message.trim() !== '' && acceptedDocuments;

    const changeGuestName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestName(e.target.value);
    }, []);

    const changeMessage = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
    }, []);

    const changeAccepted = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAcceptedDocuments(e.target.checked);
    }, []);

    const writeAnother = useCallback(() => {
        setMessage('');
        setSubmitError(null);
        setFieldErrors({});
        setSent(false);
    }, []);

    async function submit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!canSubmit) return;
        if (!termsVersion.data || !guidelinesVersion.data) {
            setSubmitError(t('anonymousUpload.acceptanceUnavailable'));
            return;
        }

        setSubmitError(null);
        setFieldErrors({});
        try {
            await sendWish.mutateAsync({
                token,
                guestName: guestName.trim(),
                message: message.trim(),
                acceptance: { termsVersion: termsVersion.data, guidelinesVersion: guidelinesVersion.data },
            });
            setSent(true);
        } catch (err) {
            // A newer version went live while the page was open: fetch both and make them tick again.
            if (isTermsVersionMismatchError(err) || isGuidelinesVersionMismatchError(err)) {
                setAcceptedDocuments(false);
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: termsVersionQueryKey }),
                    queryClient.invalidateQueries({ queryKey: communityGuidelinesQueryKey }),
                ]);
                setSubmitError(t('anonymousUpload.acceptanceChanged'));
                return;
            }
            if (isRateLimitedError(err)) {
                setSubmitError(t('guestCode.wish.rateLimited'));
                return;
            }
            if (getErrorCode(err) === ERROR_CODES.QR_LINK_NOT_AVAILABLE) {
                setSubmitError(t('guestCode.wish.notAvailable'));
                return;
            }
            const errors = getErrorCode(err) === ERROR_CODES.VALIDATION_FAILED ? getFieldErrors(err) : undefined;
            if (errors && (errors.guestName || errors.message)) {
                setFieldErrors(errors);
                return;
            }
            setSubmitError(toErrorMessage(err));
        }
    }

    return {
        guestName,
        message,
        acceptedDocuments,
        sent,
        submitError,
        fieldErrors,
        canSubmit,
        isPending,
        maxMessageLength,
        changeGuestName,
        changeMessage,
        changeAccepted,
        submit,
        writeAnother,
    };
}
