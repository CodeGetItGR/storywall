'use client';

import { useTranslations } from 'next-intl';

import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

type RevenueTotal = FunnelMetricsResponseDto['revenue']['totals'][number];

// One currency's money. Currencies are never added together.
export function FunnelRevenueTotal({ total }: { total: RevenueTotal }) {
    const t = useTranslations('AdminPage.funnel.revenue');
    const format = useFunnelFormat();
    const money = (minor: number) => format.money(minor, total.currency);

    return (
        <div className="min-w-0 rounded-lg bg-surface-muted p-4" data-testid={`revenue-${total.currency}`}>
            <p className="font-mono text-xs font-bold text-ink-muted">{total.currency}</p>
            <PlatformMetricFigure size="lg" mono label={t('net')} value={money(total.netMinor)} />
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <PlatformMetricFigure mono label={t('gross')} value={money(total.grossMinor)} />
                <PlatformMetricFigure mono label={t('refunded')} value={money(total.refundedMinor)} />
                <PlatformMetricFigure label={t('payingAccounts')} value={format.count(total.payingAccounts)} />
                <PlatformMetricFigure mono label={t('netPerPayingAccount')} value={money(total.netPerPayingAccountMinor)} />
            </div>
        </div>
    );
}
