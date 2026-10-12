'use client';

import { useTranslations } from 'next-intl';

import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { ModuleUsageFilters } from '@/components/admin/moduleUsage/ModuleUsageFilters';
import { ModuleUsageTable } from '@/components/admin/moduleUsage/ModuleUsageTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useModuleUsageDashboard } from '@/hooks/useModuleUsageDashboard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function ModuleUsagePanel() {
    const t = useTranslations('AdminPage');
    const { range, filters, rows, minEvents, isLoading, isFetching, error, updatedAt, refresh } = useModuleUsageDashboard();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('moduleUsage.title')} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range and filters */}
                <div className="space-y-3">
                    <FunnelRangeControl range={range} note={t('moduleUsage.rangeNote')} />
                    <ModuleUsageFilters filters={filters} />
                </div>

                {isLoading && <LoadingState label={t('moduleUsage.loading')} className="justify-start" />}
                {Boolean(error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

                {/* Too few events overall */}
                {rows === null && <p className="text-sm text-ink-muted">{t('moduleUsage.tooFewOverall', { count: minEvents ?? 0 })}</p>}

                {/* Modules */}
                {rows && <ModuleUsageTable rows={rows} />}
            </div>
        </div>
    );
}
