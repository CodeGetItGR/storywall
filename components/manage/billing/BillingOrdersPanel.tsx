import { useLocale, useTranslations } from 'next-intl';

import { type BillingData, type BillingDerived, type BillingInsights, useBillingDate } from '@/hooks/useEventBillingPanel';
import type { EventBillingResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

type Order = EventBillingResponseDto['orders'][number];

function orderStatusClassName(status: Order['status']) {
    return cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        status === 'PAID' && 'bg-emerald-50 text-emerald-700',
        status === 'PENDING' && 'bg-amber-50 text-amber-700',
        status === 'FAILED' && 'bg-red-50 text-red-700',
        status === 'CANCELLED' && 'bg-surface-muted text-ink-muted'
    );
}

export function BillingOrdersPanel({
    data,
    derived,
    insights,
    onShowAllOrders,
}: {
    data: BillingData;
    derived: BillingDerived;
    insights: BillingInsights;
    onShowAllOrders: () => void;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();
    const { visibleOrders, hiddenOrderCount } = derived;

    const coverageLabel = (order: Order) => {
        if (order.coversFrom && order.coversUntil)
            return t('orders.coverageRange', { from: formatDate(order.coversFrom), until: formatDate(order.coversUntil) });
        if (order.coversUntil) return t('orders.coverageThrough', { date: formatDate(order.coversUntil) });
        if (order.kind === 'UPGRADE') return t('orders.upgradeCoverage');
        if (order.kind === 'STORAGE_PACK') return t('orders.storageCoverage');
        return t('orders.recordedCharge');
    };

    const amountCell = (order: Order) => (
        <>
            {formatMoney(locale, order.amountMinor, order.currency)}
            {order.addonAmountMinor !== null && (
                <span className="block text-[10px] font-normal text-ink-muted">
                    {t('orders.addonAmount', { amount: formatMoney(locale, order.addonAmountMinor, order.currency) })}
                </span>
            )}
        </>
    );

    if (data.orders.length === 0) {
        return <p className="text-sm text-ink-muted">{t('orders.empty')}</p>;
    }

    return (
        <div>
            {insights.lastOrder && (
                <p className="mb-3 text-xs text-ink-muted">{t('orders.lastOrder', { date: formatDate(insights.lastOrder.createdAt) })}</p>
            )}

            {/* Orders (small screens) */}
            <div className="divide-y divide-ink/10 md:hidden">
                {visibleOrders.map((order) => (
                    <article key={order.id} className="py-3 text-sm first:pt-0" title={order.id}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                    <span className={orderStatusClassName(order.status)}>{t(`orderStatus.${order.status}`)}</span>
                                </div>
                                <p className="text-xs text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</p>
                            </div>
                            <p className="shrink-0 text-right font-semibold text-ink">{amountCell(order)}</p>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{coverageLabel(order)}</p>
                    </article>
                ))}
            </div>

            {/* Orders (desktop) */}
            <div className="hidden overflow-hidden rounded-lg border border-ink/10 md:block">
                <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-surface-muted text-[11px] uppercase tracking-wide text-ink-faint">
                        <tr>
                            <th className="px-3 py-2 font-semibold">{t('orders.columns.kind')}</th>
                            <th className="px-3 py-2 font-semibold md:w-28">{t('orders.columns.status')}</th>
                            <th className="px-3 py-2 font-semibold md:w-36">{t('orders.columns.date')}</th>
                            <th className="px-3 py-2 text-right font-semibold md:w-32">{t('orders.columns.amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleOrders.map((order) => (
                            <tr key={order.id} className="align-top odd:bg-card/40" title={order.id}>
                                <td className="px-3 py-2.5">
                                    <p className="font-medium text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                    <p className="mt-0.5 truncate text-xs text-ink-muted">{coverageLabel(order)}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                    <span className={orderStatusClassName(order.status)}>{t(`orderStatus.${order.status}`)}</span>
                                </td>
                                <td className="px-3 py-2.5 text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-ink">{amountCell(order)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hiddenOrderCount > 0 && (
                <button
                    type="button"
                    onClick={onShowAllOrders}
                    className="mt-3 inline-flex min-h-11 items-center justify-center text-xs font-semibold text-primary-dark"
                >
                    {t('orders.showAll', { count: hiddenOrderCount })}
                </button>
            )}
        </div>
    );
}
