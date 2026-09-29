'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { FunnelRevenueByKind } from '@/components/admin/funnel/FunnelRevenueByKind';
import { FunnelRevenueTotal } from '@/components/admin/funnel/FunnelRevenueTotal';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { BUYER_TYPES, funnelBreakdown } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelRevenue({ revenue }: { revenue: FunnelMetricsResponseDto['revenue'] }) {
    const t = useTranslations('AdminPage.funnel.revenue');
    const format = useFunnelFormat();
    const buyerRows = useMemo(() => funnelBreakdown(revenue.ordersByBuyerType, BUYER_TYPES), [revenue.ordersByBuyerType]);
    const buyerLabels = useMemo(() => Object.fromEntries(BUYER_TYPES.map((key) => [key, t(`buyer.${key}`)])), [t]);

    return (
        <FunnelGroup title={t('title')} window="payment">
            {/* Totals per currency */}
            {revenue.totals.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {revenue.totals.map((total) => (
                        <FunnelRevenueTotal key={total.currency} total={total} />
                    ))}
                </div>
            )}

            {/* By kind */}
            {revenue.byKind.length > 0 && (
                <div className="mt-6">
                    <h3 className="mb-2 text-xs font-semibold text-ink-muted">{t('byKindTitle')}</h3>
                    <FunnelRevenueByKind rows={revenue.byKind} />
                </div>
            )}

            {/* Orders and codes */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <FunnelFigures
                    className="lg:grid-cols-4"
                    figures={[
                        { key: 'refunds', label: t('refunds'), value: format.count(revenue.refunds) },
                        { key: 'adminSettledOrders', label: t('adminSettledOrders'), value: format.count(revenue.adminSettledOrders) },
                        { key: 'discountRedemptions', label: t('discountRedemptions'), value: format.count(revenue.discountRedemptions) },
                        { key: 'partnerRedemptions', label: t('partnerRedemptions'), value: format.count(revenue.partnerRedemptions) },
                    ]}
                />
                <FunnelBreakdown title={t('buyerTypes')} rows={buyerRows} labels={buyerLabels} />
            </div>
        </FunnelGroup>
    );
}
