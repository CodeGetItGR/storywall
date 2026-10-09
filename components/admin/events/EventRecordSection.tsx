'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatOptionalDateTime } from '@/lib/adminOrders';
import type { AdminEventDetailDto } from '@/lib/api/types';

// The event's own id and settings, and when it was made or deleted.
export function EventRecordSection({ event }: { event: AdminEventDetailDto }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <OrderCard title={t('events.detail.record')}>
            <div className="space-y-4">
                {/* Identifier */}
                <AdminIdentifier label={t('identifiers.eventId')} value={event.id} />

                {/* Settings and dates */}
                <OrderFactList
                    facts={[
                        {
                            key: 'visibility',
                            label: t('events.detail.visibility'),
                            value: event.visibility ? t(`events.visibility.${event.visibility}`) : null,
                        },
                        { key: 'timezone', label: t('events.detail.timezone'), value: event.timezone, mono: true },
                        { key: 'created', label: t('events.detail.created'), value: formatOptionalDateTime(locale, event.createdAt), mono: true },
                        { key: 'deleted', label: t('events.detail.deleted'), value: formatOptionalDateTime(locale, event.deletedAt), mono: true },
                    ]}
                />
            </div>
        </OrderCard>
    );
}
