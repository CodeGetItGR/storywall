'use client';

import { useTranslations } from 'next-intl';

import { CampaignFunnelTiles } from '@/components/admin/campaigns/overview/CampaignFunnelTiles';
import { CampaignHourly } from '@/components/admin/campaigns/overview/CampaignHourly';
import { CampaignPages } from '@/components/admin/campaigns/overview/CampaignPages';
import { CampaignSourceTable } from '@/components/admin/campaigns/overview/CampaignSourceTable';
import { CampaignSplits } from '@/components/admin/campaigns/overview/CampaignSplits';
import { VisitorsDaily } from '@/components/admin/visitors/VisitorsDaily';
import { type CampaignSourceGroup, showsHourly } from '@/lib/adminCampaignOverview';
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
                    {showsHourly(data) ? <CampaignHourly hourly={data.hourly} /> : <VisitorsDaily daily={data.daily} />}

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
