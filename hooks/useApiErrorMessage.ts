'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';
import {
    ERROR_CODES,
    getErrorCode,
    getErrorMessage,
    getErrorRef,
    getHostTransferUnlocksAt,
    getQuotaExceededDetails,
    getRetryAfterSeconds,
    isModuleNotAvailableError,
    isRateLimitedError,
} from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';

// Codes whose backend detail beats our fixed copy: it arrives in the user's language (the client
// sends Accept-Language) and is more specific (the missing letters, the file's actual size, the
// measured contrast ratio). The mapped copy is the fallback when there is no detail.
const DETAIL_FIRST_CODES: ReadonlySet<number> = new Set([
    ERROR_CODES.THEME_FONT_INVALID_FILE,
    ERROR_CODES.THEME_FONT_TOO_LARGE,
    ERROR_CODES.THEME_FONT_MISSING_CHARACTERS,
    ERROR_CODES.THEME_TITLE_COLOR_LOW_CONTRAST,
    ERROR_CODES.THEME_FONT_NOT_ASSIGNABLE,
    ERROR_CODES.THEME_FONT_KEY_TAKEN,
    ERROR_CODES.THEME_FONT_CONVERSION_UNAVAILABLE,
]);

// One place that turns an ApiError into copy a person can act on, so the
// cross-cutting codes from the billing guide (§3 quotas, §11 the
// 429) don't have to be re-handled at every call site. Anything it doesn't
// recognise uses localized generic copy instead of backend English detail.
export function useApiErrorMessage() {
    const t = useTranslations('ApiErrors');
    const locale = useLocale();

    const describe = useCallback(
        (error: unknown, fallback?: string): string => {
            if (getErrorCode(error) === ERROR_CODES.EVENT_NOT_ACTIVE) return t('eventNotActive');
            if (getErrorCode(error) === ERROR_CODES.COLLABORATION_CODE_NOT_VALID) return getErrorMessage(error, t('collaborationCodeNotValid'));
            if (getErrorCode(error) === ERROR_CODES.HOST_TRANSFER_WITHDRAWAL_OPEN) {
                const unlocksAt = getHostTransferUnlocksAt(error);
                if (unlocksAt) {
                    return t('hostTransferWithdrawalOpenFrom', { date: formatDate(locale, unlocksAt, { dateStyle: 'medium', timeStyle: 'short' }) });
                }
            }

            // The gallery download limits are 429s with copy of their own: the daily one can
            // ask for a wait of hours, which the generic "try again in {seconds}s" would print.
            if (getErrorCode(error) === ERROR_CODES.MEDIA_ARCHIVE_DOWNLOADS_IN_PROGRESS) return t('mediaArchiveDownloadsInProgress');
            if (getErrorCode(error) === ERROR_CODES.MEDIA_ARCHIVE_DAILY_LIMIT_REACHED) {
                const seconds = getRetryAfterSeconds(error);
                return seconds ? t('mediaArchiveDailyLimitReachedWithWait', { hours: Math.ceil(seconds / 3600) }) : t('mediaArchiveDailyLimitReached');
            }

            if (isRateLimitedError(error)) {
                const seconds = getRetryAfterSeconds(error);
                if (!seconds) return t('rateLimited');
                // An hourly upload budget can ask for most of an hour, which reads badly in seconds.
                return seconds > 90 ? t('rateLimitedWithWaitMinutes', { minutes: Math.ceil(seconds / 60) }) : t('rateLimitedWithWait', { seconds });
            }

            const quotaCode = getErrorCode(error);
            if (quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED || quotaCode === ERROR_CODES.EVENT_MEMBER_LIMIT_EXCEEDED) {
                const details = getQuotaExceededDetails(error);
                const key = quotaCode === ERROR_CODES.EVENT_STORAGE_LIMIT_EXCEEDED ? 'storageLimit' : 'memberLimit';
                return details ? t(`${key}WithPlan`, { plan: details.planCode }) : t(key);
            }

            if (isModuleNotAvailableError(error)) return t('moduleUnavailable');

            const messageKey = getApiErrorMessageKey(quotaCode);
            if (messageKey && typeof quotaCode === 'number' && DETAIL_FIRST_CODES.has(quotaCode)) {
                return getErrorMessage(error, '').trim() || t(messageKey);
            }
            if (messageKey) return t(messageKey);

            return fallback ?? t('generic');
        },
        [locale, t],
    );

    // A 500 carries a reference testers can quote in a bug report.
    return useCallback(
        (error: unknown, fallback?: string): string => {
            const message = describe(error, fallback);
            const ref = getErrorRef(error);
            return ref ? `${message} ${t('errorRef', { ref })}` : message;
        },
        [describe, t],
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
