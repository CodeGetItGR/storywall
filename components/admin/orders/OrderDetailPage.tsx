'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { OrderDetail } from '@/components/admin/orders/OrderDetail';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminOrder } from '@/hooks/useAdminOrders';
import { ORDERS_HASH_ROOT } from '@/lib/adminOrders';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function OrderDetailPage({ orderId, onBackAction }: { orderId: string; onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void }) {
    const t = useTranslations('AdminPage');
    const orderQuery = useAdminOrder(orderId);

    return (
        <div className="space-y-5">
            {/* Back */}
            <BackButton href={ORDERS_HASH_ROOT} label={t('orders.title')} onClick={onBackAction} />

            {/* Content */}
            {orderQuery.isLoading && <LoadingState label={t('orders.loading')} className="justify-start py-6" />}
            {Boolean(orderQuery.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(orderQuery.error)}`)}</p>}
            {orderQuery.data && <OrderDetail order={orderQuery.data} />}
        </div>
    );
}
