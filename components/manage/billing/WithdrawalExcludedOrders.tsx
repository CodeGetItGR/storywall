import { useLocale, useTranslations } from 'next-intl';

import type { WithdrawalExcludedOrderDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// Business-bought orders an EVENT withdrawal leaves unrefunded
// (business-buyers-fe-integration.md §4). Renders nothing when there are none.
export function WithdrawalExcludedOrders({ orders }: { orders: WithdrawalExcludedOrderDto[] | undefined }) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    if (!orders?.length) return null;

    return (
        <div className="mt-3 text-xs text-ink-muted">
            {/* Not refunded */}
            <p className="font-semibold text-ink">{t('withdrawal.excludedTitle')}</p>
            <p className="mt-0.5 leading-relaxed">{t('withdrawal.excludedBody')}</p>
            <ul className="mt-1.5 space-y-1">
                {orders.map((order) => (
                    <li key={order.orderId} className="flex items-center justify-between gap-3" title={order.orderId}>
                        <span>{t(`orders.kind.${order.orderKind}`)}</span>
                        <span className="font-semibold text-ink tabular-nums">{formatMoney(locale, order.amountMinor, order.currency)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
