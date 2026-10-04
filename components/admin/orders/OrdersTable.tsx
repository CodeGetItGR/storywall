'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { OrderFlags } from '@/components/admin/orders/OrderFlags';
import { OrderStatusPill } from '@/components/admin/orders/OrderStatusPill';
import { formatOrdersHash, orderDisplayDate } from '@/lib/adminOrders';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminOrderSummaryDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

export function OrdersTable({ orders }: { orders: AdminOrderSummaryDto[] }) {
    const t = useTranslations('AdminPage.orders');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.date')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.event')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.buyer')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.kind')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.amount')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.status')}</th>
                        <th className="px-3 py-3" />
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order) => {
                        const eventTitle = order.eventTitle ?? t('untitledEvent');
                        return (
                            <tr key={order.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/55">
                                {/* Date — the link covers the whole row */}
                                <td className="px-5 py-3">
                                    <a
                                        href={formatOrdersHash(order.id)}
                                        aria-label={t('openOrder', { event: eventTitle })}
                                        className="font-mono text-[12px] whitespace-nowrap text-ink-muted after:absolute after:inset-0"
                                    >
                                        {formatAdminDateTime(locale, orderDisplayDate(order))}
                                    </a>
                                </td>

                                {/* Event */}
                                <td className="max-w-64 px-3 py-3">
                                    <span className="block truncate font-semibold text-ink">{eventTitle}</span>
                                    {order.eventPurged && <span className="text-[11px] font-bold text-ink-faint">{t('flags.eventDeleted')}</span>}
                                </td>

                                {/* Buyer */}
                                <td className="max-w-64 px-3 py-3">
                                    <span className="block truncate text-ink">{order.buyerName ?? t('deletedAccount')}</span>
                                    {order.buyerEmail && <span className="block truncate text-xs text-ink-faint">{order.buyerEmail}</span>}
                                </td>

                                {/* Kind */}
                                <td className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-ink-muted">
                                    {t(`kind.${order.kind}`)}
                                    {order.planCode && <span className="ml-1.5 font-mono font-normal text-ink-faint">{order.planCode}</span>}
                                </td>

                                {/* Amount */}
                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                    <span className="block font-mono font-semibold text-ink tabular-nums">
                                        {formatMoney(locale, order.amountMinor, order.currency)}
                                    </span>
                                    {order.refundedAmountMinor !== null && order.refundedAmountMinor > 0 && (
                                        <span className="block font-mono text-[11px] text-status-warn tabular-nums">
                                            {t('refunded', { amount: formatMoney(locale, order.refundedAmountMinor, order.currency) })}
                                        </span>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-3 py-3">
                                    <span className="flex flex-wrap items-center gap-1">
                                        <OrderStatusPill status={order.status} />
                                        <OrderFlags order={order} />
                                    </span>
                                </td>

                                <td className="px-3 py-3 text-ink-faint">
                                    <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
