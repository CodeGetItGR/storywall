'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatOptionalDateTime } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

export function OrderBoughtSection({ coverage }: { coverage: AdminOrderDetailDto['coverage'] }) {
    const t = useTranslations('AdminPage.orders.detail');
    const locale = useLocale();

    return (
        <AdminSection title={t('sections.bought')}>
            <OrderFactList
                facts={[
                    { key: 'plan', label: t('bought.plan'), value: coverage.planCode, mono: true },
                    { key: 'storagePack', label: t('bought.storagePack'), value: coverage.paidServiceCode, mono: true },
                    {
                        key: 'length',
                        label: t('bought.length'),
                        value: coverage.coverageMonths !== null ? t('bought.months', { count: coverage.coverageMonths }) : null,
                    },
                    {
                        key: 'added',
                        label: t('bought.added'),
                        value: coverage.coverageMonthsAdded !== null ? t('bought.months', { count: coverage.coverageMonthsAdded }) : null,
                    },
                    { key: 'starts', label: t('bought.starts'), value: formatOptionalDateTime(locale, coverage.coverageStartsAt), mono: true },
                    { key: 'ends', label: t('bought.ends'), value: formatOptionalDateTime(locale, coverage.coverageEndsAt), mono: true },
                ]}
            />
        </AdminSection>
    );
}
