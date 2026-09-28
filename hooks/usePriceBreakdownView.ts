'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { PriceBreakdown } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { breakdownDiscountMessageKey, breakdownItemLabelValues, breakdownItemMessageKey } from '@/lib/priceBreakdown';

const VAT_INCLUDED_NOTE = 'billing.vat.included';

/**
 * A PriceBreakdown as display strings (withdrawal-compliance phase 4 §3/§4):
 * each item's label, price, struck-through list price and withdrawal rule, then
 * the discounts, the total, the VAT note and the withdrawal window.
 */
export function usePriceBreakdownView(breakdown: PriceBreakdown | null | undefined) {
    const t = useTranslations('PriceBreakdown');
    const locale = useLocale();

    return useMemo(() => {
        if (!breakdown) return null;
        const money = (minor: number) => formatMoney(locale, minor, breakdown.currency);
        // A business buyer sees the business notice instead of the rules.
        const showRules = breakdown.buyerType === 'CONSUMER';

        return {
            items: breakdown.items.map((item, index) => {
                const messageKey = breakdownItemMessageKey(item.labelKey);
                const monthsText = item.months !== null ? t('months', { months: item.months }) : '';
                return {
                    key: `${item.code}-${index}`,
                    label: messageKey ? t(`items.${messageKey}`, breakdownItemLabelValues(item, monthsText)) : item.name,
                    price: money(item.priceMinor),
                    listPrice: item.discountMinor > 0 ? money(item.listMinor) : null,
                    rule: showRules ? t(`rules.${item.withdrawal}`) : null,
                };
            }),
            discounts: breakdown.discounts.map((discount) =>
                t(`discounts.${breakdownDiscountMessageKey(discount)}`, { label: discount.label ?? '', percent: discount.percent }),
            ),
            total: money(breakdown.totalMinor),
            vatNote: breakdown.vat.included && breakdown.vat.note === VAT_INCLUDED_NOTE ? t('vatIncluded') : null,
            withdrawWithin: showRules && breakdown.withdrawal.available ? t('withdrawWithin', { days: breakdown.withdrawal.windowDays }) : null,
        };
    }, [breakdown, locale, t]);
}

export type PriceBreakdownView = NonNullable<ReturnType<typeof usePriceBreakdownView>>;
