'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PlatformMetricBreakdown } from '@/components/admin/PlatformMetricBreakdown';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import { type MetricShare, ratioOf } from '@/lib/adminUtils';
import { formatCount, formatPercent } from '@/lib/format';

export function PlatformUsersGroup({ total, active, byAccountPlan }: { total: number; active: number; byAccountPlan: MetricShare[] }) {
    const t = useTranslations('AdminPage.metrics');
    const locale = useLocale();

    return (
        <PlatformMetricGroup title={t('users')}>
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4">
                <PlatformMetricFigure size="lg" label={t('totalUsers')} value={formatCount(total)} />
                <PlatformMetricFigure
                    size="lg"
                    label={t('activeUsers')}
                    value={formatCount(active)}
                    hint={t('activeShare', { percent: formatPercent(locale, ratioOf(active, total)) })}
                />
            </div>

            {/* Breakdown */}
            <div className="mt-6">
                <PlatformMetricBreakdown title={t('usersByAccountPlan')} shares={byAccountPlan} />
            </div>
        </PlatformMetricGroup>
    );
}
