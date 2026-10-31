'use client';

import { useTranslations } from 'next-intl';

import { CampaignFunnelTiles } from '@/components/admin/campaigns/overview/CampaignFunnelTiles';
import { CampaignPages } from '@/components/admin/campaigns/overview/CampaignPages';
import { CampaignSourceTable } from '@/components/admin/campaigns/overview/CampaignSourceTable';
import { CampaignSplits } from '@/components/admin/campaigns/overview/CampaignSplits';
import { CampaignVisitorsChart } from '@/components/admin/campaigns/overview/CampaignVisitorsChart';
import type { CampaignSourceGroup } from '@/lib/adminCampaignOverview';
import type { CampaignOverviewDto } from '@/lib/api/types';

// sourceGroups is left out for one link's stats, which have no By source table.
export function CampaignOverviewContent({
    data,
    sourceGroups,
    picked = false,
}: {
    data: CampaignOverviewDto;
    sourceGroups?: CampaignSourceGroup[];
    picked?: boolean;
}) {
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
                    <CampaignVisitorsChart data={data} />

                    {/* By source */}
                    {sourceGroups && sourceGroups.length > 0 && <CampaignSourceTable groups={sourceGroups} picked={picked} />}

                    {/* Landing page */}
                    <CampaignPages pages={data.pages} />

                    {/* Language and device */}
                    <CampaignSplits data={data} />
                </>
            )}
        </div>
    );
}
