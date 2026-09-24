'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { billingKeys, useCheckout } from '@/hooks/useBilling';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';

/**
 * Checkout + consent for an already-created DRAFT event's /manage page —
 * the "come back later and pay" and "returned from a cancelled Stripe
 * session" entry points. Mirrors the wizard's own checkout call.
 */
export function useDraftActivationCheckout(eventId: string) {
    const checkout = useCheckout(eventId);
    const queryClient = useQueryClient();
    const consent = useWithdrawalConsent();
    const toErrorMessage = useApiErrorMessage();
    const [collaborationCode, setCollaborationCode] = useState<string | null>(null);
    const [collaborationPreview, setCollaborationPreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    useResetOnBfcacheRestore(checkout.reset);

    const handleCollaborationPreviewChange = useCallback((nextCode: string | null, nextPreview: CollaborationCodePreviewResponseDto | null) => {
        setCollaborationCode(nextCode);
        setCollaborationPreview(nextPreview);
    }, []);

    const submit = useCallback(async () => {
        if (!consent.consentSatisfied || !consent.termsVersion) return;
        setError(null);
        try {
            const response = await checkout.mutateAsync({
                ...(collaborationCode ? { collaborationCode } : {}),
                requestsImmediateStart: consent.requestsImmediateStart,
                acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                termsVersion: consent.termsVersion,
            });
            navigateToCheckout(eventId, response);
        } catch (checkoutError) {
            if (consent.handleCheckoutError(checkoutError)) return;
            // The draft's duration was retired: reload the plans and the draft so
            // the overview asks for another one.
            if (getErrorCode(checkoutError) === ERROR_CODES.COVERAGE_OPTION_UNAVAILABLE) {
                void queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
                void queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
            }
            setError(toErrorMessage(checkoutError));
        }
    }, [checkout, collaborationCode, consent, eventId, queryClient, toErrorMessage]);

    return {
        consent,
        collaborationPreview,
        handleCollaborationPreviewChange,
        submit,
        error,
        isPending: checkout.isPending,
    };
}
