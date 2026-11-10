'use client';

import { type MouseEvent, useCallback } from 'react';

import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGNS_HASH_ROOT, CAMPAIGNS_PAST, formatRecordHash } from '@/lib/adminRecordRouting';
import type { CampaignTab } from '@/lib/campaignCompare';

function tabRecord(tab: CampaignTab): string | null {
    return tab === 'past' ? CAMPAIGNS_PAST : null;
}

// The Campaigns section: one range shared by the list and a campaign's page, the list's tab, and which
// campaign is open. `#campaigns` is Current, `#campaigns/past` Past, `#campaigns/<id>` a campaign.
export function useCampaignsPage() {
    const range = useFunnelRange('LAST_30');
    const page = useAdminRecordPage(CAMPAIGNS_HASH_ROOT);
    const { recordId, push, replace } = page;

    const tab: CampaignTab = recordId === CAMPAIGNS_PAST ? 'past' : 'current';
    const campaignId = recordId !== null && recordId !== CAMPAIGNS_PAST ? recordId : null;

    // A tab is not a Back step.
    const handleTabChange = useCallback((next: CampaignTab) => replace(tabRecord(next)), [replace]);

    const tabHref = useCallback((next: CampaignTab) => formatRecordHash(CAMPAIGNS_HASH_ROOT, tabRecord(next)), []);

    // A campaign's Back link names the tab that lists it; going there is a Back step of its own.
    const handleBackClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            push(event.currentTarget.hash === tabHref('past') ? CAMPAIGNS_PAST : null);
        },
        [push, tabHref],
    );

    return {
        range,
        tab,
        campaignId,
        handleTabChange,
        tabHref,
        handleBackClick,
        // A campaign that no longer exists: back to the list, with no Back step to it.
        showList: page.showList,
        handleRecordLinkClick: page.handleRecordLinkClick,
        handleRecordRowClick: page.handleRecordRowClick,
    };
}
