'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCheckout } from '@/hooks/useBilling';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';

/**
 * Checkout + consent for an already-created DRAFT event's /manage page —
 * the "come back later and pay" and "returned from a cancelled Stripe
 * session" entry points. Mirrors the wizard's own checkout call.
 */
export function useDraftActivationCheckout(eventId: string) {
    const checkout = useCheckout(eventId);
    const consent = useWithdrawalConsent();
    const toErrorMessage = useApiErrorMessage();
    const [collaborationCode, setCollaborationCode] = useState<string | null>(null);
    const [collaborationPreview, setCollaborationPreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            setError(toErrorMessage(checkoutError));
        }
    }, [checkout, collaborationCode, consent, eventId, toErrorMessage]);

    return {
        consent,
        collaborationPreview,
        handleCollaborationPreviewChange,
        submit,
        error,
        isPending: checkout.isPending,
    };
}
