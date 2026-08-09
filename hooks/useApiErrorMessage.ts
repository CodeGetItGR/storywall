'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
    ERROR_CODES,
    getErrorCode,
    getErrorMessage,
    getQuotaExceededDetails,
    getRetryAfterSeconds,
    isEventFrozenError,
    isModuleNotAvailableError,
    isRateLimitedError,
} from '@/lib/api/errors';

const BILLING_ERROR_KEYS: Record<number, string> = {
    [ERROR_CODES.EVENT_DATES_INCOMPLETE]: 'eventDatesIncomplete',
    [ERROR_CODES.EVENT_NOT_DRAFT]: 'eventNotDraft',
    [ERROR_CODES.PLAN_TIER_NOT_PURCHASABLE]: 'planNotPurchasable',
    [ERROR_CODES.PLAN_TIER_NOT_PRICED]: 'planNotPriced',
    [ERROR_CODES.PLAN_TIER_CURRENCY_UNSUPPORTED]: 'planCurrencyUnsupported',
    [ERROR_CODES.PLAN_TIER_NOT_AN_UPGRADE]: 'planNotAnUpgrade',
    [ERROR_CODES.PLAN_TIER_CURRENCY_MISMATCH]: 'planCurrencyMismatch',
    [ERROR_CODES.CHECKOUT_SESSION_UNRESOLVED]: 'checkoutSessionUnresolved',
    [ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE]: 'subscriptionAlreadyActive',
    [ERROR_CODES.REFUND_NOT_ELIGIBLE]: 'refundNotEligible',
    [ERROR_CODES.REFUND_ALREADY_REQUESTED]: 'refundAlreadyRequested',
    [ERROR_CODES.ORDER_NOT_REFUNDABLE]: 'orderNotRefundable',
    [ERROR_CODES.SUBSCRIPTION_NOT_LIVE]: 'subscriptionNotLive',
    // A 502, but not a generic server failure: the provider refused, so nothing
    // was cancelled and the card is still being charged. Saying "something went
    // wrong" here lets a host walk away believing they cancelled.
    [ERROR_CODES.SUBSCRIPTION_CANCEL_FAILED]: 'subscriptionCancelFailed',
};

// One place that turns an ApiError into copy a person can act on, so the
// cross-cutting codes from the billing guide (§3 quotas, §5 frozen, §11 the
// 429) don't have to be re-handled at every call site. Anything it doesn't
// recognise falls through to the server's own `detail` string.
export function useApiErrorMessage() {
    const t = useTranslations('ApiErrors');

    return useCallback(
        (error: unknown, fallback?: string): string => {
            if (isEventFrozenError(error)) return t('eventFrozen');
            if (getErrorCode(error) === ERROR_CODES.EVENT_NOT_ACTIVE) return t('eventNotActive');

            if (isRateLimitedError(error)) {
                const seconds = getRetryAfterSeconds(error);
                return seconds ? t('rateLimitedWithWait', { seconds }) : t('rateLimited');
            }

            const quotaCode = getErrorCode(error);
            if (
                quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED ||
                quotaCode === ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED ||
                quotaCode === ERROR_CODES.ACTIVE_EVENT_LIMIT_EXCEEDED
            ) {
                const details = getQuotaExceededDetails(error);
                const key =
                    quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED
                        ? 'storageLimit'
                        : quotaCode === ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED
                          ? 'memberLimit'
                          : 'activeEventLimit';
                return details ? t(`${key}WithPlan`, { plan: details.planCode }) : t(key);
            }

            if (isModuleNotAvailableError(error)) return t('moduleUnavailable');

            // Checkout and refund outcomes. Without these the fallback is the
            // server's own `detail`, which is only ever written in English —
            // on the one screen where money is involved.
            const billingKey = BILLING_ERROR_KEYS[quotaCode as number];
            if (billingKey) return t(billingKey);

            return getErrorMessage(error, fallback ?? t('generic'));
        },
        [t]
    );
}

// Counts down the wait a 429 asked for, so a submit control can stay disabled
// until retrying is actually allowed instead of failing again on the next tap.
// Returns 0 when the last error wasn't a 429 (or the wait has elapsed).
export function useRetryAfterCountdown(error: unknown): number {
    // Counted in elapsed ticks rather than against a wall-clock deadline: the
    // remaining value is then derived during render from state alone, with no
    // clock reads and no setState in the effect body.
    const [tracked, setTracked] = useState({ error, seconds: getRetryAfterSeconds(error) ?? 0 });
    const [ticks, setTicks] = useState(0);

    if (tracked.error !== error) {
        setTracked({ error, seconds: getRetryAfterSeconds(error) ?? 0 });
        setTicks(0);
    }

    const remaining = Math.max(0, tracked.seconds - ticks);
    const done = remaining <= 0;

    useEffect(() => {
        if (done) return;
        const timer = setInterval(() => setTicks((value) => value + 1), 1000);
        return () => clearInterval(timer);
    }, [done]);

    return remaining;
}
