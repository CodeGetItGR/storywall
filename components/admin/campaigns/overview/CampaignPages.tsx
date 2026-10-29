'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { pageRows, UNKNOWN_PAGE } from '@/lib/adminCampaignOverview';
import type { CampaignOverviewDto } from '@/lib/api/types';

// Visits per landing page, shown by path.
export function CampaignPages({ pages }: { pages: CampaignOverviewDto['pages'] }) {
    const t = useTranslations('AdminPage.campaignOverview.pages');

    return (
        <FunnelGroup title={t('title')} window="visit">
            <FunnelBreakdown title={t('page')} rows={pageRows(pages)} labels={{ [UNKNOWN_PAGE]: t('unknown') }} />
        </FunnelGroup>
    );
}
