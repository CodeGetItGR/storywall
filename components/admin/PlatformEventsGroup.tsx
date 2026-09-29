'use client';

import { useLocale, useTranslations } from 'next-intl';

import { PlatformMetricBreakdown } from '@/components/admin/PlatformMetricBreakdown';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import { type MetricShare, ratioOf } from '@/lib/adminUtils';
import { formatCount, formatPercent } from '@/lib/format';

export function PlatformEventsGroup({
    total,
    active,
    byStatus,
    byPlanTier,
}: {
    total: number;
    active: number;
    byStatus: MetricShare[];
    byPlanTier: MetricShare[];
}) {
    const t = useTranslations('AdminPage.metrics');
    const locale = useLocale();

    return (
        <PlatformMetricGroup title={t('events')}>
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4">
                <PlatformMetricFigure size="lg" label={t('totalEvents')} value={formatCount(total)} />
                <PlatformMetricFigure
                    size="lg"
                    label={t('activeEvents')}
                    value={formatCount(active)}
                    hint={t('activeShare', { percent: formatPercent(locale, ratioOf(active, total)) })}
                />
            </div>

            {/* Breakdowns */}
            <div className="mt-6 space-y-5">
                <PlatformMetricBreakdown title={t('eventsByPlanTier')} shares={byPlanTier} />
                <PlatformMetricBreakdown title={t('eventsByStatus')} shares={byStatus} />
            </div>
        </PlatformMetricGroup>
    );
}
