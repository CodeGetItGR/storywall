'use client';

import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { useAdminDiscountCampaigns } from '@/hooks/useAdminDiscountCampaigns';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';

// token: which opening this is. The drawer is keyed on it, so each opening starts from the saved values.
type DrawerState = { open: boolean; campaign: AdminDiscountCampaignDto | null; token: number };

const NO_CAMPAIGNS: AdminDiscountCampaignDto[] = [];

export function useDiscountCampaignsPanel() {
    const query = useAdminDiscountCampaigns();
    const campaigns = query.data ?? NO_CAMPAIGNS;
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, campaign: null, token: 0 });
    const nextToken = useRef(0);

    const open = useCallback((campaign: AdminDiscountCampaignDto | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, campaign, token: nextToken.current });
    }, []);

    const handleCreateClick = useCallback(() => open(null), [open]);

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = campaigns.find((campaign) => campaign.id === event.currentTarget.dataset.campaignId);
            if (found) open(found);
        },
        [campaigns, open],
    );

    const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

    return { query, campaigns, drawer, handleCreateClick, handleEditClick, closeDrawer };
}
