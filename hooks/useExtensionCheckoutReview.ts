'use client';

import { useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useExtensionCheckout, useExtensionOptions } from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { navigateToCheckout } from '@/lib/billing';

type ExtensionConsent = { requestsImmediateStart: boolean; acknowledgesWithdrawalTerms: boolean };

/**
 * The extension branch of the checkout review: the picked option, and the
 * checkout call that redirects to the provider. Errors are rethrown so the page
 * shows them like any other checkout's; this hook only reacts to the ones that
 * change what it offers (coverage ended, option no longer sold).
 */
export function useExtensionCheckoutReview(eventId: string, optionId: string | null, enabled: boolean) {
    const appConfig = useAppConfig();
    const options = useExtensionOptions(eventId, enabled);
    const checkout = useExtensionCheckout(eventId);
    const [endedAtCheckout, setEndedAtCheckout] = useState(false);

    const termsVersion = appConfig.data?.withdrawal.termsVersion ?? null;
    const option = optionId ? (options.data?.find((entry) => entry.coverageOptionId === optionId) ?? null) : null;
    const ended = endedAtCheckout || getErrorCode(options.error) === ERROR_CODES.COVERAGE_ENDED;
    const { refetch: refetchOptions } = options;
    const { mutateAsync } = checkout;

    const startCheckout = useCallback(
        async (consent: ExtensionConsent) => {
            if (!option || !termsVersion) return;
            try {
                const response = await mutateAsync({
                    coverageOptionId: option.coverageOptionId,
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion,
                });
                navigateToCheckout(eventId, response);
            } catch (error) {
                const code = getErrorCode(error);
                if (code === ERROR_CODES.COVERAGE_ENDED) setEndedAtCheckout(true);
                if (code === ERROR_CODES.COVERAGE_OPTION_INVALID) void refetchOptions();
                throw error;
            }
        },
        [eventId, mutateAsync, option, refetchOptions, termsVersion],
    );

    return {
        option,
        ended,
        // A coverage-ended answer is a result to explain, not a load failure.
        error: ended ? null : options.error,
        isLoading: options.isLoading,
        isPending: checkout.isPending,
        reset: checkout.reset,
        refetch: refetchOptions,
        startCheckout,
    };
}
