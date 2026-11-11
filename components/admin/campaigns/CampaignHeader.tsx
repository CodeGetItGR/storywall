'use client';

import { Link2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CAMPAIGN_SECONDARY_BUTTON } from '@/components/admin/campaigns/campaignButtons';
import { CampaignDiscountBadge } from '@/components/admin/campaigns/CampaignDiscountBadge';
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import type { CampaignDto } from '@/lib/api/types';

export function CampaignHeader({
    campaign,
    updatedAt,
    isFetching,
    onRefreshAction,
    onLinksAction,
    onEditAction,
}: {
    campaign: CampaignDto;
    updatedAt: string | null;
    isFetching: boolean;
    onRefreshAction: () => void;
    onLinksAction: () => void;
    onEditAction: () => void;
}) {
    const t = useTranslations('AdminPage.campaigns');

    return (
        <div>
            {/* Title */}
            <FunnelHeader title={campaign.name} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={onRefreshAction} />

            <div className="-mt-3 flex flex-wrap items-center justify-between gap-3">
                {/* Status and discount */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <CampaignStatusBadge status={campaign.status} />
                    {campaign.discount && <CampaignDiscountBadge discount={campaign.discount} withDates />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onLinksAction} className={CAMPAIGN_SECONDARY_BUTTON}>
                        <Link2 aria-hidden="true" className="h-4 w-4" />
                        {t('linksButton', { count: campaign.linkCount })}
                    </button>
                    <button type="button" onClick={onEditAction} className={CAMPAIGN_SECONDARY_BUTTON}>
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        {t('edit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
