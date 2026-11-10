'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGNS_HASH_ROOT, CAMPAIGNS_PAST, formatRecordHash } from '@/lib/adminRecordRouting';
import type { CampaignTab } from '@/lib/campaignCompare';

export type CampaignDrawer = 'new' | 'edit' | 'links';

// The open drawer, and what a campaign's page needs to open and close its own. token changes on every
// opening, so a drawer keyed on it starts from fresh state.
export type CampaignDrawers = {
    drawer: CampaignDrawer | null;
    token: number;
    openEdit: () => void;
    openLinks: () => void;
    close: () => void;
    handleDeleted: () => void;
};

function tabRecord(tab: CampaignTab): string | null {
    return tab === 'past' ? CAMPAIGNS_PAST : null;
}

// The Campaigns section: one range shared by the list and a campaign's page, the list's tab, and which
// campaign is open. `#campaigns` is Current, `#campaigns/past` Past, `#campaigns/<id>` a campaign.
export function useCampaignsPage() {
    const range = useFunnelRange('LAST_30');
    const page = useAdminRecordPage(CAMPAIGNS_HASH_ROOT);
    const { recordId, push, replace } = page;
    const { showList } = page;
    const [drawer, setDrawer] = useState<CampaignDrawer | null>(null);
    const [token, setToken] = useState(0);

    const open = useCallback((next: CampaignDrawer) => {
        setDrawer(next);
        setToken((current) => current + 1);
    }, []);
    const openNewCampaign = useCallback(() => open('new'), [open]);
    const openEdit = useCallback(() => open('edit'), [open]);
    const openLinks = useCallback(() => open('links'), [open]);
    const close = useCallback(() => setDrawer(null), []);

    // A new campaign opens on its page, as a Back step of its own.
    const openCampaign = useCallback(
        (id: string) => {
            setDrawer(null);
            push(id);
        },
        [push],
    );

    // A deleted campaign: back to the list, with no Back step to its page.
    const handleDeleted = useCallback(() => {
        setDrawer(null);
        showList();
    }, [showList]);

    const drawers = useMemo<CampaignDrawers>(
        () => ({ drawer, token, openEdit, openLinks, close, handleDeleted }),
        [close, drawer, handleDeleted, openEdit, openLinks, token],
    );

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
        drawers,
        openNewCampaign,
        openCampaign,
        // A campaign that no longer exists: back to the list, with no Back step to it.
        showList: page.showList,
        handleRecordLinkClick: page.handleRecordLinkClick,
        handleRecordRowClick: page.handleRecordRowClick,
    };
}
