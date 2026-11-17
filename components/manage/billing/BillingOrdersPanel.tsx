import { useLocale, useTranslations } from 'next-intl';

import { BillingOrderRow } from '@/components/manage/billing/BillingOrderRow';
import { useBillingOrderRows } from '@/hooks/useBillingOrderRows';
import type { BillingData, BillingDerived, BillingInsights } from '@/hooks/useEventBillingPanel';
import type { OrderSummaryDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';

// Order history: one row per order on every screen size, then the total paid.
export function BillingOrdersPanel({
    data,
    derived,
    insights,
    onShowAllOrders,
    withdrawableOrderIds,
    onWithdrawAction,
}: {
    data: BillingData;
    derived: BillingDerived;
    insights: BillingInsights;
    onShowAllOrders: () => void;
    // Orders that get "Withdraw from contract here" (primary host, window open).
    withdrawableOrderIds?: ReadonlySet<string>;
    onWithdrawAction?: (order: OrderSummaryDto) => void;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const rows = useBillingOrderRows(derived.visibleOrders, withdrawableOrderIds);
    const totalPaidLabel = formatOptionalMoney(insights.paidTotalMinor, insights.orderCurrency, locale);

    return (
        <section aria-labelledby="billing-orders-title" className="flex flex-col gap-1">
            {/* Heading */}
            <h2 id="billing-orders-title" className="text-[17px] font-bold text-ink">
                {t('orders.title')}
            </h2>

            {data.orders.length === 0 ? (
                /* Empty */
                <p className="pt-2 text-sm text-ink-muted">{t('orders.empty')}</p>
            ) : (
                <>
                    {/* Orders */}
                    <ul className="flex flex-col">
                        {rows.map((row) => (
                            <BillingOrderRow key={row.order.id} row={row} onWithdrawAction={onWithdrawAction} />
                        ))}
                    </ul>

                    {/* Older orders */}
                    {derived.hiddenOrderCount > 0 && (
                        <button
                            type="button"
                            onClick={onShowAllOrders}
                            className="inline-flex min-h-11 items-center self-start text-xs font-semibold text-primary-dark"
                        >
                            {t('orders.showAll', { count: derived.hiddenOrderCount })}
                        </button>
                    )}

                    {/* Total */}
                    {totalPaidLabel && (
                        <p className="flex justify-between gap-3 border-t border-border pt-3 text-sm">
                            <span className="text-ink-muted">{t('facts.totalPaid')}</span>
                            <strong className="font-bold text-ink tabular-nums">{totalPaidLabel}</strong>
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
