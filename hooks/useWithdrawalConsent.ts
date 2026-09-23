'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

/**
 * State and submit-time error handling for the Directive 2011/83/EU right-of-withdrawal
 * consent checkboxes. Shared by the create-event wizard, the draft-manage pay flow, and
 * CheckoutReviewBoundary's upgrade path — anywhere a checkout call requires
 * requestsImmediateStart/acknowledgesWithdrawalTerms/termsVersion.
 */
export function useWithdrawalConsent() {
    const appConfig = useAppConfig();
    const termsVersion = appConfig.data?.withdrawal.termsVersion ?? null;

    const [requestsImmediateStart, setRequestsImmediateStart] = useState(false);
    const [acknowledgesWithdrawalTerms, setAcknowledgesWithdrawalTerms] = useState(false);
    const [staleTerms, setStaleTerms] = useState(false);

    const handleRequestsImmediateStartChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setRequestsImmediateStart(event.target.checked);
    }, []);

    const handleAcknowledgesWithdrawalTermsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAcknowledgesWithdrawalTerms(event.target.checked);
    }, []);

    const consentSatisfied = requestsImmediateStart && acknowledgesWithdrawalTerms && Boolean(termsVersion);

    // Returns true when the error was the stale-terms case, so the caller knows not to
    // also surface a second, generic error message for the same failure.
    const handleCheckoutError = useCallback(
        (error: unknown): boolean => {
            if (getErrorCode(error) !== ERROR_CODES.WITHDRAWAL_TERMS_VERSION_STALE) return false;
            setStaleTerms(true);
            setRequestsImmediateStart(false);
            setAcknowledgesWithdrawalTerms(false);
            void appConfig.refetch();
            return true;
        },
        [appConfig],
    );

    return {
        termsVersion,
        requestsImmediateStart,
        acknowledgesWithdrawalTerms,
        staleTerms,
        consentSatisfied,
        handleRequestsImmediateStartChange,
        handleAcknowledgesWithdrawalTermsChange,
        handleCheckoutError,
    };
}

export type WithdrawalConsent = ReturnType<typeof useWithdrawalConsent>;
