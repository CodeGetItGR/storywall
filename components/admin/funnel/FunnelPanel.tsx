'use client';

import { useTranslations } from 'next-intl';

import { FunnelAccounts } from '@/components/admin/funnel/FunnelAccounts';
import { FunnelActivity } from '@/components/admin/funnel/FunnelActivity';
import { FunnelCohorts } from '@/components/admin/funnel/FunnelCohorts';
import { FunnelGuestToHost } from '@/components/admin/funnel/FunnelGuestToHost';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelHeadline } from '@/components/admin/funnel/FunnelHeadline';
import { FunnelPaidEvents } from '@/components/admin/funnel/FunnelPaidEvents';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { FunnelRevenue } from '@/components/admin/funnel/FunnelRevenue';
import { FunnelSteps } from '@/components/admin/funnel/FunnelSteps';
import { FunnelStuck } from '@/components/admin/funnel/FunnelStuck';
import { FunnelTimeToConvert } from '@/components/admin/funnel/FunnelTimeToConvert';
import { LoadingState } from '@/components/ui/LoadingState';
import { useFunnelDashboard } from '@/hooks/useFunnelDashboard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function FunnelPanel() {
    const t = useTranslations('AdminPage');
    const { range, metrics, isLoading, isFetching, error, updatedAt, refresh, cohorts } = useFunnelDashboard();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range */}
                <FunnelRangeControl range={range} />

                {isLoading && <LoadingState label={t('funnel.loading')} className="justify-start" />}
                {Boolean(error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

                {metrics && (
                    <>
                        {/* Headline */}
                        <FunnelHeadline funnel={metrics.funnel} />

                        {/* Funnel */}
                        <FunnelSteps funnel={metrics.funnel} />

                        {/* Where people stall */}
                        <FunnelStuck stuck={metrics.stuck} />

                        {/* Activity */}
                        <FunnelActivity activity={metrics.activity} />

                        {/* Time to convert and guest to host */}
                        <div className="grid gap-5 lg:grid-cols-2">
                            <FunnelTimeToConvert timeToConvert={metrics.timeToConvert} />
                            <FunnelGuestToHost guestToHost={metrics.guestToHost} />
                        </div>
                    </>
                )}

                {/* Weekly cohorts (independent of the range) */}
                <FunnelCohorts cohorts={cohorts} />

                {metrics && (
                    <>
                        {/* Paid events */}
                        <FunnelPaidEvents paidEvents={metrics.paidEvents} />

                        {/* Revenue */}
                        <FunnelRevenue revenue={metrics.revenue} />

                        {/* Accounts */}
                        <FunnelAccounts accounts={metrics.accounts} />
                    </>
                )}
            </div>
        </div>
    );
}
