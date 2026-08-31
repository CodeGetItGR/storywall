'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';
import {
    ERROR_CODES,
    getErrorCode,
    getErrorMessage,
    getQuotaExceededDetails,
    getRetryAfterSeconds,
    isModuleNotAvailableError,
    isRateLimitedError,
} from '@/lib/api/errors';

// One place that turns an ApiError into copy a person can act on, so the
// cross-cutting codes from the billing guide (§3 quotas, §11 the
// 429) don't have to be re-handled at every call site. Anything it doesn't
// recognise uses localized generic copy instead of backend English detail.
export function useApiErrorMessage() {
    const t = useTranslations('ApiErrors');

    return useCallback(
        (error: unknown, fallback?: string): string => {
            if (getErrorCode(error) === ERROR_CODES.EVENT_NOT_ACTIVE) return t('eventNotActive');
            if (getErrorCode(error) === ERROR_CODES.COLLABORATION_CODE_NOT_VALID) return getErrorMessage(error, t('collaborationCodeNotValid'));

            if (isRateLimitedError(error)) {
                const seconds = getRetryAfterSeconds(error);
                return seconds ? t('rateLimitedWithWait', { seconds }) : t('rateLimited');
            }

            const quotaCode = getErrorCode(error);
            if (quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED || quotaCode === ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED) {
                const details = getQuotaExceededDetails(error);
                const key = quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED ? 'storageLimit' : 'memberLimit';
                return details ? t(`${key}WithPlan`, { plan: details.planCode }) : t(key);
            }

            if (isModuleNotAvailableError(error)) return t('moduleUnavailable');

            const messageKey = getApiErrorMessageKey(quotaCode);
            if (messageKey) return t(messageKey);

            return fallback ?? t('generic');
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
