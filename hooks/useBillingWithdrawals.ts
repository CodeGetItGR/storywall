'use client';

import { useMemo } from 'react';

import { useEventBilling, useEventWithdrawals, useLegacyOrderWithdrawalPreviews } from '@/hooks/useBilling';
import type { OrderSummaryDto, WithdrawalPreviewResponseDto } from '@/lib/api/types';
import { orderWithdrawalWindowOpen, withdrawableOrderIds, withdrawalPurchaseBlocks } from '@/lib/priceBreakdown';

const NO_ORDERS: OrderSummaryDto[] = [];

/**
 * The billing page's withdrawal facts: the host's request history, which orders
 * get a "Withdraw" action, and which purchases a request under review pauses.
 * `canWithdraw` is the primary host on a live event; `canSeeHistory` also covers
 * a deleted event, whose refund is shown here.
 */
export function useBillingWithdrawals(
    eventId: string,
    orders: OrderSummaryDto[] | undefined,
    { canWithdraw, canSeeHistory }: { canWithdraw: boolean; canSeeHistory: boolean },
) {
    const history = useEventWithdrawals(eventId, canSeeHistory);
    const allOrders = orders ?? NO_ORDERS;

    // Orders from before V106 have no breakdown: only their preview says.
    const legacyOrders = useMemo(
        () => (canWithdraw ? allOrders.filter((order) => orderWithdrawalWindowOpen(order) === null) : NO_ORDERS),
        [allOrders, canWithdraw],
    );
    const legacyPreviews = useLegacyOrderWithdrawalPreviews(eventId, legacyOrders, canWithdraw);
    const legacyPreviewData = legacyPreviews.map((query) => query.data);

    const previewsByOrder = new Map<string, WithdrawalPreviewResponseDto>();
    legacyOrders.forEach((order, index) => {
        const preview = legacyPreviewData[index];
        if (preview) previewsByOrder.set(order.id, preview);
    });

    return {
        history: history.data ?? [],
        withdrawableOrderIds: canWithdraw ? withdrawableOrderIds(allOrders, previewsByOrder) : new Set<string>(),
        purchaseBlocks: withdrawalPurchaseBlocks(history.data, allOrders),
    };
}

export type BillingWithdrawals = ReturnType<typeof useBillingWithdrawals>;

// Whether a whole-event withdrawal under review pauses storage-pack purchases
// (phase 2 §9). The 409 at checkout stays the backstop.
export function useStoragePurchasePaused(eventId: string, enabled: boolean): boolean {
    const billing = useEventBilling(eventId, enabled);
    const withdrawals = useEventWithdrawals(eventId, enabled);
    return withdrawalPurchaseBlocks(withdrawals.data, billing.data?.orders).storageBlocked;
}
