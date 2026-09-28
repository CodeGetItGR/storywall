'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useOrderWithdrawalPreview, useSubmitOrderWithdrawal } from '@/hooks/useBilling';
import { useMe } from '@/hooks/useMe';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { OrderSummaryDto } from '@/lib/api/types';
import { formatMoney, lastWithdrawalMoment } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';
import { formatBytes } from '@/lib/format';

/**
 * One order's withdrawal (phase 4 §6): "Withdraw" opens the preview, the host
 * reads it, then "Confirm withdrawal" files it. The activation withdraws the
 * whole event; an upgrade, pack or extension withdraws that order only.
 */
export function useOrderWithdrawalFlow(eventId: string, { currentLimitBytes }: { currentLimitBytes: number | null }) {
    const locale = useLocale();
    const me = useMe();
    const toErrorMessage = useApiErrorMessage();
    const [order, setOrder] = useState<OrderSummaryDto | null>(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const preview = useOrderWithdrawalPreview(eventId, order);
    const submit = useSubmitOrderWithdrawal(eventId);
    const retryIn = useRetryAfterCountdown(submit.error);
    const data = preview.data;

    const open = useCallback((next: OrderSummaryDto) => {
        setOrder(next);
        setReason('');
        setError(null);
    }, []);
    const close = useCallback(() => setOrder(null), []);
    const handleReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value), []);

    const { mutateAsync } = submit;
    const { refetch } = preview;
    const confirm = useCallback(async () => {
        if (!order) return;
        setError(null);
        try {
            await mutateAsync({ order, input: reason.trim() ? { reason: reason.trim() } : {} });
            setOrder(null);
        } catch (submitError) {
            // A refusal's reasons come from the preview; reload it so they show.
            if (getErrorCode(submitError) === ERROR_CODES.WITHDRAWAL_REFUSED) void refetch();
            setError(toErrorMessage(submitError));
        }
    }, [mutateAsync, order, reason, refetch, toErrorMessage]);

    const dateTime = (value: string | Date) => formatDate(locale, value, { dateStyle: 'medium', timeStyle: 'short' });
    const storageAfter = data?.storageAfter ?? null;

    return {
        order,
        isOpen: order !== null,
        preview: data ?? null,
        isLoading: preview.isLoading,
        loadFailed: Boolean(preview.error),
        refundLabel: data ? formatMoney(locale, data.totalRefundMinor, data.currency) : null,
        deadlineLabel: data?.windowClosesAt ? dateTime(lastWithdrawalMoment(data.windowClosesAt)) : null,
        storage: storageAfter && {
            from: currentLimitBytes === null ? null : formatBytes(currentLimitBytes),
            to: storageAfter.newLimitBytes === null ? null : formatBytes(storageAfter.newLimitBytes),
            usage: formatBytes(storageAfter.usageBytes),
            over: storageAfter.overLimitBytes > 0 ? formatBytes(storageAfter.overLimitBytes) : null,
            trimDue: storageAfter.trimDueAt ? dateTime(storageAfter.trimDueAt) : null,
        },
        // A paid order links the terms version its checkout acknowledged.
        termsVersion: order?.breakdown?.termsVersion ?? null,
        name: [me.data?.firstName, me.data?.lastName].filter(Boolean).join(' '),
        email: me.data?.email ?? '',
        reason,
        error,
        retryIn,
        isSubmitting: submit.isPending,
        open,
        close,
        handleReasonChange,
        confirm,
    };
}

export type OrderWithdrawalFlow = ReturnType<typeof useOrderWithdrawalFlow>;
