'use client';

import { useEffect } from 'react';

import { useAdminDiscountCampaigns } from '@/hooks/useAdminDiscountCampaigns';
import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { DISCOUNT_CAMPAIGNS_HASH_ROOT } from '@/lib/adminRecordRouting';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';

const NO_CAMPAIGNS: AdminDiscountCampaignDto[] = [];

export function useDiscountCampaignsPanel() {
    const query = useAdminDiscountCampaigns();
    const campaigns = query.data ?? NO_CAMPAIGNS;
    const page = useAdminRecordPage(DISCOUNT_CAMPAIGNS_HASH_ROOT);
    const { recordId, showList } = page;
    const campaign = recordId ? (campaigns.find((one) => one.id === recordId) ?? null) : null;
    const missing = recordId !== null && !query.isLoading && !campaign;

    // A deleted campaign, or an address that never was one, shows the list.
    useEffect(() => {
        if (missing) showList();
    }, [missing, showList]);

    return { query, campaigns, campaign, page };
}
