'use client';

import { useTranslations } from 'next-intl';

import { CampaignOverviewContent } from '@/components/admin/campaigns/overview/CampaignOverviewContent';
import { CampaignSourcePicker } from '@/components/admin/campaigns/overview/CampaignSourcePicker';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { VisitorsSkeleton } from '@/components/admin/visitors/VisitorsSkeleton';
import { useCampaignOverview } from '@/hooks/useCampaignOverview';
import { CAMPAIGN_RANGE_PRESETS } from '@/lib/adminFunnel';

// Every saved link together, or one source: the funnel, visitors per day or hour, the sources,
// landing pages, and language and device.
export function CampaignOverviewPanel() {
    const t = useTranslations('AdminPage.campaignOverview');
    const { range, source, sourceOptions, handleSourceChange, sourceGroups, data, isLoading, isFetching, error, updatedAt, refresh } =
        useCampaignOverview();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('title')} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range and source */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <FunnelRangeControl range={range} presets={CAMPAIGN_RANGE_PRESETS} note={t('rangeNote')} />
                    <CampaignSourcePicker value={source} options={sourceOptions} onChangeAction={handleSourceChange} />
                </div>

                {/* States */}
                {isLoading && <VisitorsSkeleton />}
                {Boolean(error) && (
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-status-danger">{t('error')}</p>
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={isFetching}
                            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('retry')}
                        </button>
                    </div>
                )}

                {/* Content */}
                {data && <CampaignOverviewContent data={data} sourceGroups={sourceGroups} picked={source !== null} />}
            </div>
        </div>
    );
}
