'use client';

import { useTranslations } from 'next-intl';

import { OrderActivityRow } from '@/components/admin/orders/OrderActivityRow';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { orderActivity } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

// The order's history in one place: payment, disputes, refunds, withdrawals and commission, oldest first.
export function OrderActivitySection({ order }: { order: AdminOrderDetailDto }) {
    const t = useTranslations('AdminPage.orders.detail');
    const items = orderActivity(order);

    return (
        <OrderCard title={t('sections.activity')}>
            <ol>
                {items.map((item, index) => (
                    <OrderActivityRow key={`${item.kind}-${index}`} item={item} currency={order.summary.currency} />
                ))}
            </ol>
        </OrderCard>
    );
}
