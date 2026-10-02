'use client';

import { useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSection } from '@/components/admin/AdminSection';
import { OrderFactList } from '@/components/admin/orders/OrderFactList';
import { businessSnapshotEntries } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';

// The business details are the ones the order was sold under, frozen at checkout.
export function OrderBuyerSection({ buyer }: { buyer: AdminOrderDetailDto['buyer'] }) {
    const t = useTranslations('AdminPage.orders');
    const business = buyer.businessSnapshot ? businessSnapshotEntries(buyer.businessSnapshot) : [];

    return (
        <AdminSection title={t('detail.sections.buyer')}>
            <div className="space-y-4">
                {/* Name */}
                <p className="text-base font-semibold text-ink">{buyer.name ?? t('deletedAccount')}</p>

                {/* Contact */}
                <OrderFactList
                    facts={[
                        { key: 'email', label: t('detail.buyer.email'), value: buyer.email },
                        { key: 'type', label: t('detail.buyer.type'), value: t(`buyerType.${buyer.buyerType}`) },
                        ...business.map(({ key, value }) => ({ key, label: t(`detail.buyer.business.${key}`), value, mono: key === 'vatNumber' })),
                    ]}
                />

                {/* Identifiers */}
                {(buyer.userId || buyer.providerCustomerId) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {buyer.userId && <AdminIdentifier label={t('detail.buyer.account')} value={buyer.userId} hideValue />}
                        {buyer.providerCustomerId && (
                            <AdminIdentifier label={t('detail.buyer.stripeCustomer')} value={buyer.providerCustomerId} hideValue />
                        )}
                    </div>
                )}
            </div>
        </AdminSection>
    );
}
