'use client';

import { CampaignDiscountBadge } from '@/components/admin/campaigns/CampaignDiscountBadge';
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import type { CampaignDto } from '@/lib/api/types';

export function CampaignHeader({
    campaign,
    updatedAt,
    isFetching,
    onRefreshAction,
}: {
    campaign: CampaignDto;
    updatedAt: string | null;
    isFetching: boolean;
    onRefreshAction: () => void;
}) {
    return (
        <div>
            {/* Title */}
            <FunnelHeader title={campaign.name} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={onRefreshAction} />

            {/* Status and discount */}
            <div className="-mt-3 flex flex-wrap items-center gap-1.5">
                <CampaignStatusBadge status={campaign.status} />
                {campaign.discount && <CampaignDiscountBadge discount={campaign.discount} withDates />}
            </div>
        </div>
    );
}
