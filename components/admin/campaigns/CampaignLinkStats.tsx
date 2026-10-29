'use client';

import { useTranslations } from 'next-intl';

import { CampaignOverviewContent } from '@/components/admin/campaigns/overview/CampaignOverviewContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminCampaignOverview } from '@/hooks/useAdminCampaigns';
import type { FunnelBounds } from '@/lib/adminFunnel';

// One saved link's funnel, visitors per day or hour, landing pages, and language and device, in the
// table's range.
export function CampaignLinkStats({ linkId, bounds }: { linkId: string; bounds: FunnelBounds }) {
    const t = useTranslations('AdminPage.campaigns');
    const query = useAdminCampaignOverview(bounds.since, bounds.until, linkId, { enabled: bounds.isValid });

    if (query.isLoading) return <LoadingState className="justify-start py-4" />;
    if (query.error) return <p className="text-sm text-status-danger">{t('statsError')}</p>;
    return query.data ? <CampaignOverviewContent data={query.data} /> : null;
}
