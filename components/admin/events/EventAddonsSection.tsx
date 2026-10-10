'use client';

import { useTranslations } from 'next-intl';

import { EventAddonRow } from '@/components/admin/events/EventAddonRow';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import type { AdminEventDetailDto } from '@/lib/api/types';

// The add-ons the host bought for this event. Removing one takes away what it gives, without a refund.
export function EventAddonsSection({
    addons,
    editable,
    onRemoveAction,
}: {
    addons: AdminEventDetailDto['addons'];
    editable: boolean;
    onRemoveAction: (code: string, name: string) => void;
}) {
    const t = useTranslations('AdminPage.events.addons');

    return (
        <OrderCard title={t('title')}>
            {addons.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {addons.map((addon) => (
                        <EventAddonRow key={addon.code} addon={addon} editable={editable} onRemoveAction={onRemoveAction} />
                    ))}
                </ul>
            )}
        </OrderCard>
    );
}
