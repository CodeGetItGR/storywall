'use client';

import { useLocale, useTranslations } from 'next-intl';

import { OrderCard } from '@/components/admin/orders/OrderCard';
import { OrderTaxLines } from '@/components/admin/orders/OrderTaxLines';
import { PriceBreakdownSummary } from '@/components/checkout/PriceBreakdownSummary';
import type { AdminOrderDetailDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// The price as the buyer saw it at checkout. The total is in the page header.
export function OrderPriceSection({ pricing }: { pricing: AdminOrderDetailDto['pricing'] }) {
    const t = useTranslations('AdminPage.orders.detail');
    const locale = useLocale();

    return (
        <OrderCard title={t('sections.price')}>
            <div className="space-y-3">
                {/* Items */}
                {pricing.priceBreakdown ? (
                    <PriceBreakdownSummary breakdown={pricing.priceBreakdown} showTotal={false} />
                ) : (
                    pricing.checkoutLines && (
                        <ul className="space-y-2">
                            {pricing.checkoutLines.map((line, index) => (
                                <li key={index} className="flex items-start justify-between gap-6 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-ink">{line.name}</p>
                                        {line.description && <p className="mt-0.5 text-xs text-ink-muted">{line.description}</p>}
                                    </div>
                                    <p className="shrink-0 font-mono font-semibold text-ink tabular-nums">
                                        {formatMoney(locale, line.amountMinor, pricing.currency)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )
                )}

                {/* Discount (the breakdown already names it) */}
                {!pricing.priceBreakdown && pricing.discountLabel && (
                    <p className="text-sm text-ink-muted">
                        {t('price.discount')}: <span className="font-semibold text-ink">{pricing.discountLabel}</span>
                    </p>
                )}

                {/* Tax (the breakdown already says when prices include VAT) */}
                {pricing.taxAmountMinor !== null ? (
                    <div className="space-y-1.5">
                        <p className="flex justify-between gap-6 text-sm">
                            <span className="text-ink-muted">{t('price.tax')}</span>
                            <span className="font-mono font-semibold text-ink tabular-nums">
                                {formatMoney(locale, pricing.taxAmountMinor, pricing.currency)}
                            </span>
                        </p>
                        {pricing.taxLines.length > 0 && <OrderTaxLines lines={pricing.taxLines} currency={pricing.currency} />}
                    </div>
                ) : (
                    !pricing.priceBreakdown && <p className="text-xs text-ink-faint">{t('price.noTax')}</p>
                )}
            </div>
        </OrderCard>
    );
}
