'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatOptionalDateTime } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

// The order's own ids and the terms the buyer agreed to.
export function OrderRecordSection({ order }: { order: AdminOrderDetailDto }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const { consent } = order;

    return (
        <OrderCard title={t('orders.detail.sections.record')}>
            <div className="space-y-4">
                {/* Identifiers */}
                <div className="space-y-3">
                    <AdminIdentifier label={t('orders.detail.record.orderId')} value={order.summary.id} />
                    <AdminIdentifier label={t('identifiers.eventId')} value={order.summary.eventId} hideValue />
                </div>

                {/* Consent */}
                <OrderFactList
                    facts={[
                        { key: 'terms', label: t('orders.detail.record.terms'), value: consent.termsVersion, mono: true },
                        {
                            key: 'immediateStart',
                            label: t('orders.detail.record.immediateStart'),
                            value: formatOptionalDateTime(locale, consent.immediateStartAt),
                            mono: true,
                        },
                        {
                            key: 'acknowledged',
                            label: t('orders.detail.record.acknowledged'),
                            value: formatOptionalDateTime(locale, consent.acknowledgedAt),
                            mono: true,
                        },
                    ]}
                />
            </div>
        </OrderCard>
    );
}
