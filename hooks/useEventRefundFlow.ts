'use client';

import type React from 'react';
import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useEventRefundRequests, useRefundEligibility, useRequestRefund } from '@/hooks/useBilling';

/**
 * The refund request/history/eligibility state, extracted out of
 * useEventBillingPanel so it can be mounted on its own (Danger zone) without
 * pulling in the rest of that hook's plan/orders/app-config fetches.
 */
export function useEventRefundFlow(eventId: string) {
    const refundEligibility = useRefundEligibility(eventId);
    const requestRefund = useRequestRefund(eventId);
    const refundHistory = useEventRefundRequests(eventId);
    const toErrorMessage = useApiErrorMessage();
    const refundRetryIn = useRetryAfterCountdown(requestRefund.error);

    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);

    // Server-side history, so a decision (and its note) survives a reload - the
    // page used to only know about a request the same tab had just submitted.
    const refundRequest = refundHistory.data?.[0] ?? null;

    const cancelRefundConfirmation = useCallback(() => setConfirmingRefund(false), []);

    const handleRefundReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setRefundReason(event.target.value);
    }, []);

    const askRefundConfirmation = useCallback((event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRefundError(null);
        setConfirmingRefund(true);
    }, []);

    const submitRefundRequest = useCallback(async () => {
        setRefundError(null);
        try {
            await requestRefund.mutateAsync(refundReason.trim());
            setRefundReason('');
            setConfirmingRefund(false);
        } catch (e) {
            setRefundError(toErrorMessage(e));
            setConfirmingRefund(false);
        }
    }, [refundReason, requestRefund, toErrorMessage]);

    return {
        refundEligibility,
        refundHistory,
        refundRequest,
        refundReason,
        refundError,
        refundRetryIn,
        confirmingRefund,
        isRequestingRefund: requestRefund.isPending,
        handleRefundReasonChange,
        askRefundConfirmation,
        submitRefundRequest,
        cancelRefundConfirmation,
    };
}

export type EventRefundFlow = ReturnType<typeof useEventRefundFlow>;
