'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSection } from '@/components/admin/AdminSection';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatOptionalDateTime } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

// Ids, the terms the buyer agreed to, and who settled the order if an admin did.
export function OrderRecordSection({ order }: { order: AdminOrderDetailDto }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const { consent, settledBy } = order;

    return (
        <AdminSection title={t('orders.detail.sections.record')}>
            <div className="space-y-4">
                {/* Identifiers */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <AdminIdentifier label={t('orders.detail.record.orderId')} value={order.summary.id} />
                    <AdminIdentifier label={t('identifiers.eventId')} value={order.summary.eventId} hideValue />
                </div>

                {/* Consent and settlement */}
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
                        {
                            key: 'settledBy',
                            label: t('orders.detail.record.settledBy'),
                            value: settledBy ? (settledBy.name ?? settledBy.email) : null,
                        },
                    ]}
                />
            </div>
        </AdminSection>
    );
}
