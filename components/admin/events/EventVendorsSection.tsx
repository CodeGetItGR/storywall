'use client';

import { useLocale, useTranslations } from 'next-intl';

import { OrderCard } from '@/components/admin/orders/OrderCard';
import { useAdminEventVendors } from '@/hooks/useAdminEvents';
import { formatDate } from '@/lib/datetime';

// The event's vendors, read-only: type, business name and joined date.
export function EventVendorsSection({ eventId }: { eventId: string }) {
    const t = useTranslations('Vendors');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const { data: vendors = [], isLoading } = useAdminEventVendors(eventId);

    return (
        <OrderCard title={t('admin.title')}>
            {isLoading ? null : vendors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('admin.empty')}</p>
            ) : (
                <ul className="space-y-4">
                    {vendors.map((vendor) => (
                        <li key={vendor.id} className="min-w-0">
                            {/* Business */}
                            <p className="truncate text-sm font-semibold text-ink">{vendor.businessName ?? tAdmin('none')}</p>

                            {/* Type and joined date */}
                            <p className="mt-1 flex items-center gap-2">
                                <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-ink-muted">
                                    {t(`types.${vendor.vendorType}`)}
                                </span>
                                <span className="truncate font-mono text-xs text-ink-muted">
                                    {t('admin.joined', { date: formatDate(locale, vendor.joinedAt, { dateStyle: 'medium' }) })}
                                </span>
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </OrderCard>
    );
}
