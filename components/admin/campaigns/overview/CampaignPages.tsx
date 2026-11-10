'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { pageRows, UNKNOWN_PAGE } from '@/lib/adminCampaignOverview';
import type { CampaignDetailDto } from '@/lib/api/types';

// Visits per landing page, shown by path.
export function CampaignPages({ pages }: { pages: CampaignDetailDto['pages'] }) {
    const t = useTranslations('AdminPage.campaigns.landing');

    return (
        <FunnelGroup title={t('title')} window="visit">
            <FunnelBreakdown title={t('page')} rows={pageRows(pages)} labels={{ [UNKNOWN_PAGE]: t('unknown') }} />
        </FunnelGroup>
    );
}
