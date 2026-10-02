'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSection } from '@/components/admin/AdminSection';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminOrderDetailDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

export function OrderRefundSection({ refund, currency }: { refund: NonNullable<AdminOrderDetailDto['refund']>; currency: string }) {
    const t = useTranslations('AdminPage.orders');
    const locale = useLocale();

    return (
        <AdminSection title={t('detail.sections.refund')}>
            <div className="space-y-4">
                {/* Facts */}
                <OrderFactList
                    facts={[
                        { key: 'date', label: t('detail.refund.date'), value: formatAdminDateTime(locale, refund.refundedAt), mono: true },
                        {
                            key: 'amount',
                            label: t('detail.refund.amount'),
                            value: refund.amountMinor !== null ? formatMoney(locale, refund.amountMinor, currency) : t('detail.refund.notRecorded'),
                            mono: refund.amountMinor !== null,
                        },
                        { key: 'source', label: t('detail.refund.source'), value: refund.source ? t(`refundSource.${refund.source}`) : null },
                    ]}
                />

                {/* Identifier */}
                {refund.providerRefundId && <AdminIdentifier label={t('detail.refund.stripeRefund')} value={refund.providerRefundId} />}
            </div>
        </AdminSection>
    );
}
