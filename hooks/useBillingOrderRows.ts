'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useBillingDate } from '@/hooks/useEventBillingPanel';
import type { OrderSummaryDto } from '@/lib/api/types';
import { formatOptionalMoney, isOrderPaidByAnother } from '@/lib/billing';

export type BillingOrderRowData = {
    order: OrderSummaryDto;
    kindLabel: string;
    statusLabel: string;
    dateLabel: string;
    // "Gift" when another host paid it, else the amount (a dash when there is none).
    amountLabel: string;
    // The add-ons' share of the amount, when there is one.
    addonLabel: string | null;
    // What the order covers: an extension's span, or what an upgrade or storage pack changed.
    coverageLabel: string | null;
    // Inside the withdrawal window: "Withdraw from contract here" on this row.
    canWithdraw: boolean;
};

type Translate = ReturnType<typeof useTranslations<'EventPlanSettingsPage'>>;

function coverageLabel(order: OrderSummaryDto, t: Translate, formatDate: (value: string | null) => string): string | null {
    if (order.kind === 'UPGRADE') return t('orders.upgradeCoverage');
    if (order.kind === 'STORAGE_PACK') return t('orders.storageCoverage');
    // An extension's own span is what the host is looking for.
    if (order.kind === 'EXTENSION' && order.coverageStartsAt && order.coverageEndsAt)
        return t('orders.coverageRange', { from: formatDate(order.coverageStartsAt), until: formatDate(order.coverageEndsAt) });
    return null;
}

/** One row per order for Order history, every label ready to render. */
export function useBillingOrderRows(orders: OrderSummaryDto[], withdrawableOrderIds?: ReadonlySet<string>): BillingOrderRowData[] {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    return useMemo(
        () =>
            orders.map((order) => {
                const addonAmount = order.addonAmountMinor ? formatOptionalMoney(order.addonAmountMinor, order.currency, locale) : null;
                return {
                    order,
                    kindLabel: t(`orders.kind.${order.kind}`),
                    statusLabel: t(`orderStatus.${order.status}`),
                    dateLabel: formatDate(order.paidAt ?? order.createdAt),
                    amountLabel: isOrderPaidByAnother(order) ? t('orders.gift') : (formatOptionalMoney(order.amountMinor, order.currency, locale) ?? '—'),
                    addonLabel: !isOrderPaidByAnother(order) && addonAmount ? t('orders.addonAmount', { amount: addonAmount }) : null,
                    coverageLabel: coverageLabel(order, t, formatDate),
                    canWithdraw: withdrawableOrderIds?.has(order.id) ?? false,
                };
            }),
        [formatDate, locale, orders, t, withdrawableOrderIds],
    );
}
