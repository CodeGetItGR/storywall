'use client';

import { type MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useAdminRecordPage } from '@/hooks/useAdminRecordPage';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { CAMPAIGNS_HASH_ROOT, CAMPAIGNS_PAST, formatRecordHash } from '@/lib/adminRecordRouting';
import type { CampaignTab } from '@/lib/campaignCompare';
import { overlayStepsOnPage, skipGonePage } from '@/lib/overlayHistory';

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
    const { showList, handleRecordLinkClick, handleRecordRowClick } = page;
    const [drawer, setDrawer] = useState<CampaignDrawer | null>(null);
    const [token, setToken] = useState(0);
    // The campaign whose page was opened from a list row, or made from the list's New campaign: the
    // history entry below its page is that list. Kept here, not in history state, which Next rewrites.
    const openedFromList = useRef<string | null>(null);

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

    // A new campaign opens on its page. The drawer's Back step, still open on the list, becomes the page,
    // so Back goes to the list it was made from. The drawer's close then only drops its marker: an owner
    // close never moves through history.
    const openCampaign = useCallback(
        (id: string) => {
            const onDrawer = overlayStepsOnPage() > 0;
            setDrawer(null);
            if (onDrawer) replace(id);
            else push(id);
            openedFromList.current = id;
        },
        [push, replace],
    );

    // A deleted campaign: every history entry at its page is skipped from now on. Opened from a list, one
    // traversal goes back past its drawers and its page to that list; any leftover entry of the page that
    // traversal lands on is skipped too. Opened any other way, its page becomes the list in place.
    const handleDeleted = useCallback(() => {
        setDrawer(null);
        if (campaignId === null) {
            showList();
            return;
        }
        skipGonePage(window.location.href);
        const fromList = openedFromList.current === campaignId;
        openedFromList.current = null;
        if (fromList) window.history.go(-(overlayStepsOnPage() + 1));
        else showList();
    }, [campaignId, showList]);

    // A campaign opened from a list row.
    const markOpened = useCallback((before: string, id: string | undefined) => {
        if (id && window.location.hash !== before) openedFromList.current = id;
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
