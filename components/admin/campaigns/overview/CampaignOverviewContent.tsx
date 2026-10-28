'use client';

import { useTranslations } from 'next-intl';

import { CampaignFunnelTiles } from '@/components/admin/campaigns/overview/CampaignFunnelTiles';
import { CampaignSplits } from '@/components/admin/campaigns/overview/CampaignSplits';
import { VisitorsDaily } from '@/components/admin/visitors/VisitorsDaily';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignOverviewContent({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview');

    return (
        <div className="@container space-y-5">
            {/* Funnel */}
            <CampaignFunnelTiles data={data} />

            {data.visits === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Visitors over time */}
                    <VisitorsDaily daily={data.daily} />

                    {/* Language and device */}
                    <CampaignSplits data={data} />
                </>
            )}
        </div>
    );
}
