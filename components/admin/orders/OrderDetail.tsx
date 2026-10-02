'use client';

import { useLocale, useTranslations } from 'next-intl';

import { OrderBoughtSection } from '@/components/admin/orders/OrderBoughtSection';
import { OrderBuyerSection } from '@/components/admin/orders/OrderBuyerSection';
import { OrderCommissionSection } from '@/components/admin/orders/OrderCommissionSection';
import { OrderFlags } from '@/components/admin/orders/OrderFlags';
import { OrderPaymentSection } from '@/components/admin/orders/OrderPaymentSection';
import { OrderPriceSection } from '@/components/admin/orders/OrderPriceSection';
import { OrderRecordSection } from '@/components/admin/orders/OrderRecordSection';
import { OrderRefundSection } from '@/components/admin/orders/OrderRefundSection';
import { OrderStatusPill } from '@/components/admin/orders/OrderStatusPill';
import { OrderWithdrawalsSection } from '@/components/admin/orders/OrderWithdrawalsSection';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminOrderDetailDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

export function OrderDetail({ order }: { order: AdminOrderDetailDto }) {
    const t = useTranslations('AdminPage.orders');
    const locale = useLocale();
    const { summary } = order;

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
                        {formatMoney(locale, summary.amountMinor, summary.currency)}
                    </h1>
                    <OrderStatusPill status={summary.status} />
                    <OrderFlags order={summary} />
                </div>
                <p className="text-sm text-ink-muted">
                    {t(`kind.${summary.kind}`)} · {summary.eventTitle ?? t('untitledEvent')}
                    {summary.eventPurged && <span className="ml-1.5 text-xs font-bold text-ink-faint">{t('flags.eventDeleted')}</span>}
                    {' · '}
                    {t('detail.placed', { date: formatAdminDateTime(locale, summary.createdAt) })}
                </p>
            </header>

            {/* Sections */}
            <div>
                <OrderBuyerSection buyer={order.buyer} />
                <OrderPriceSection pricing={order.pricing} />
                <OrderBoughtSection coverage={order.coverage} />
                <OrderPaymentSection payment={order.payment} />
                {order.refund && <OrderRefundSection refund={order.refund} currency={summary.currency} />}
                {order.withdrawals.length > 0 && <OrderWithdrawalsSection withdrawals={order.withdrawals} currency={summary.currency} />}
                {order.commissions.length > 0 && <OrderCommissionSection commissions={order.commissions} />}
                <OrderRecordSection order={order} />
            </div>
        </div>
    );
}
