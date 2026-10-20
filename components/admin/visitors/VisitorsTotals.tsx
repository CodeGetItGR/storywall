'use client';

import { useLocale, useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { formatPer100, signupsPer100Visits } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsTotals({ data }: { data: VisitorMetricsDto }) {
    const t = useTranslations('AdminPage.visitors.totals');
    const locale = useLocale();
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <PlatformMetricFigure label={t('visitors')} value={format.count(data.visitors)} />
                <PlatformMetricFigure label={t('visits')} value={format.count(data.visits)} />
                <PlatformMetricFigure label={t('signups')} value={format.count(data.signups)} />
                <PlatformMetricFigure label={t('per100')} value={formatPer100(locale, signupsPer100Visits(data.signups, data.visits))} />
            </div>
        </FunnelGroup>
    );
}
