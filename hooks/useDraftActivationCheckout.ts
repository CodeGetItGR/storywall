'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { billingKeys, useCheckout, useEventQuote } from '@/hooks/useBilling';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { CollaborationCodePreviewResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';

const ACTIVATION_QUOTE = { kind: 'ACTIVATION' } as const;

/**
 * Checkout + consent for an already-created DRAFT event's /manage page —
 * the "come back later and pay" and "returned from a cancelled Stripe
 * session" entry points. Mirrors the wizard's own checkout call.
 */
export function useDraftActivationCheckout(eventId: string, { quoteEnabled, startAt }: { quoteEnabled: boolean; startAt: string | null }) {
    const checkout = useCheckout(eventId);
    const queryClient = useQueryClient();
    const consent = useWithdrawalConsent();
    const toErrorMessage = useApiErrorMessage();
    const [collaborationCode, setCollaborationCode] = useState<string | null>(null);
    const [collaborationPreview, setCollaborationPreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    // The failure is kept with the start it was for: moving the date clears it.
    const [failure, setFailure] = useState<{ message: string; startPassed: boolean; startAt: string | null } | null>(null);

    useResetOnBfcacheRestore(checkout.reset);

    // The server's price for the pay button: a typed code's preview when there
    // is one, else the activation quote (which already holds a redeemed code).
    const quote = useEventQuote(eventId, ACTIVATION_QUOTE, quoteEnabled);
    const breakdown = collaborationPreview?.breakdown ?? (quoteEnabled ? (quote.data ?? null) : null);

    const handleCollaborationPreviewChange = useCallback((nextCode: string | null, nextPreview: CollaborationCodePreviewResponseDto | null) => {
        setCollaborationCode(nextCode);
        setCollaborationPreview(nextPreview);
    }, []);

    const submit = useCallback(async () => {
        if (!consent.consentSatisfied || !consent.termsVersion) return;
        setFailure(null);
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
            setFailure({
                message: toErrorMessage(checkoutError),
                startPassed: getErrorCode(checkoutError) === ERROR_CODES.EVENT_START_PASSED,
                startAt,
            });
        }
    }, [checkout, collaborationCode, consent, eventId, queryClient, startAt, toErrorMessage]);

    const currentFailure = failure && failure.startAt === startAt ? failure : null;
    // The quote answers 3035 too, so a passed date shows before the host tries to pay.
    const quoteStartPassed = quoteEnabled && getErrorCode(quote.error) === ERROR_CODES.EVENT_START_PASSED;

    return {
        consent,
        collaborationPreview,
        breakdown,
        handleCollaborationPreviewChange,
        submit,
        error: currentFailure?.message ?? (quoteStartPassed ? toErrorMessage(quote.error) : null),
        startPassed: Boolean(currentFailure?.startPassed) || quoteStartPassed,
        isPending: checkout.isPending,
    };
}
