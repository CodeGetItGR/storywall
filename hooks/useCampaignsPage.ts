'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGNS_HASH_ROOT, CAMPAIGNS_PAST, formatRecordHash } from '@/lib/adminRecordRouting';
import type { CampaignTab } from '@/lib/campaignCompare';
import { markPageEntry, overlayEntryCount, pageEntryMark } from '@/lib/overlayHistory';

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

// A campaign's page opened from a list carries its id under this key, so leaving it after a delete can
// go Back to that list instead of adding another list step.
const OPENED_FROM_LIST = '__storywallCampaignFromList';

function tabRecord(tab: CampaignTab): string | null {
    return tab === 'past' ? CAMPAIGNS_PAST : null;
}

// The Campaigns section: one range shared by the list and a campaign's page, the list's tab, and which
// campaign is open. `#campaigns` is Current, `#campaigns/past` Past, `#campaigns/<id>` a campaign.
export function useCampaignsPage() {
    const range = useFunnelRange('LAST_30');
    const page = useAdminRecordPage(CAMPAIGNS_HASH_ROOT);
    const { recordId, push, replace } = page;
    const { showList, handleRecordLinkClick, handleRecordRowClick } = page;
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

    const tab: CampaignTab = recordId === CAMPAIGNS_PAST ? 'past' : 'current';
    const campaignId = recordId !== null && recordId !== CAMPAIGNS_PAST ? recordId : null;

    // A new campaign opens on its page, in place of the drawer's Back step, so Back goes to the list it
    // was made from.
    const openCampaign = useCallback(
        (id: string) => {
            setDrawer(null);
            if (overlayEntryCount() > 0) replace(id);
            else push(id);
            markPageEntry(OPENED_FROM_LIST, id);
        },
        [push, replace],
    );

    // A deleted campaign: Back past its drawers to the list it was opened from. Opened any other way, its
    // page becomes the list. Either way no Back step leads to it.
    const handleDeleted = useCallback(() => {
        setDrawer(null);
        const fromList = campaignId !== null && pageEntryMark(OPENED_FROM_LIST) === campaignId;
        const steps = overlayEntryCount() + (fromList ? 1 : 0);
        if (steps === 0) {
            showList();
            return;
        }
        if (!fromList) window.addEventListener('popstate', showList, { once: true });
        window.history.go(-steps);
    }, [campaignId, showList]);

    // A campaign opened from a list row notes it on its page.
    const markOpened = useCallback((before: string, id: string | undefined) => {
        if (id && window.location.hash !== before) markPageEntry(OPENED_FROM_LIST, id);
    }, []);

    const handleCampaignLinkClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            const before = window.location.hash;
            handleRecordLinkClick(event);
            markOpened(before, event.currentTarget.dataset.recordId);
        },
        [handleRecordLinkClick, markOpened],
    );

    const handleCampaignRowClick = useCallback(
        (event: MouseEvent<HTMLTableRowElement>) => {
            const before = window.location.hash;
            handleRecordRowClick(event);
            markOpened(before, event.currentTarget.dataset.recordId);
        },
        [handleRecordRowClick, markOpened],
    );

    const drawers = useMemo<CampaignDrawers>(
        () => ({ drawer, token, openEdit, openLinks, close, handleDeleted }),
        [close, drawer, handleDeleted, openEdit, openLinks, token],
    );

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
        handleRecordLinkClick: handleCampaignLinkClick,
        handleRecordRowClick: handleCampaignRowClick,
    };
}
