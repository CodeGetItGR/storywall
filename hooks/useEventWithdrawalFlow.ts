'use client';

import { useLocale } from 'next-intl';
import type React from 'react';
import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useEventWithdrawals, useSubmitWithdrawal, useWithdrawalPreview } from '@/hooks/useBilling';
import { formatMoney, lastWithdrawalMoment } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';

/**
 * The withdrawal preview/history/submit state, extracted out on its own (Danger zone).
 */
export function useEventWithdrawalFlow(eventId: string) {
    const withdrawalPreview = useWithdrawalPreview(eventId);
    const submitWithdrawal = useSubmitWithdrawal(eventId);
    const withdrawalHistory = useEventWithdrawals(eventId);
    const toErrorMessage = useApiErrorMessage();
    const withdrawalRetryIn = useRetryAfterCountdown(submitWithdrawal.error);
    const locale = useLocale();
    const preview = withdrawalPreview.data;
    const refundAmountLabel = formatMoney(locale, preview?.totalRefundMinor ?? 0, preview?.currency ?? null);
    const withdrawalDeadlineLabel = preview?.windowClosesAt
        ? formatDate(locale, lastWithdrawalMoment(preview.windowClosesAt), { dateStyle: 'medium', timeStyle: 'short' })
        : null;

    const [withdrawalReason, setWithdrawalReason] = useState('');
    const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
    const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);

    // Server-side history, so a REFUNDED/HELD/WITHHELD outcome survives a reload —
    // the page used to only know about a request the same tab had just submitted.
    const latestWithdrawal = withdrawalHistory.data?.[0] ?? null;

    const cancelWithdrawalConfirmation = useCallback(() => setConfirmingWithdrawal(false), []);

    const handleWithdrawalReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setWithdrawalReason(event.target.value);
    }, []);

    const askWithdrawalConfirmation = useCallback((event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setWithdrawalError(null);
        setConfirmingWithdrawal(true);
    }, []);

    const submitWithdrawalRequest = useCallback(async () => {
        setWithdrawalError(null);
        try {
            await submitWithdrawal.mutateAsync(withdrawalReason.trim() ? { reason: withdrawalReason.trim() } : {});
            setWithdrawalReason('');
            setConfirmingWithdrawal(false);
        } catch (e) {
            setWithdrawalError(toErrorMessage(e));
            setConfirmingWithdrawal(false);
        }
    }, [withdrawalReason, submitWithdrawal, toErrorMessage]);

    return {
        withdrawalPreview,
        withdrawalHistory,
        latestWithdrawal,
        refundAmountLabel,
        withdrawalDeadlineLabel,
        withdrawalReason,
        withdrawalError,
        withdrawalRetryIn,
        confirmingWithdrawal,
        isSubmittingWithdrawal: submitWithdrawal.isPending,
        handleWithdrawalReasonChange,
        askWithdrawalConfirmation,
        submitWithdrawalRequest,
        cancelWithdrawalConfirmation,
    };
}

export type EventWithdrawalFlow = ReturnType<typeof useEventWithdrawalFlow>;
