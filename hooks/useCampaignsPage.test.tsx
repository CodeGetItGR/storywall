import { act, cleanup, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignsPage } from '@/hooks/useCampaignsPage';
import { registerOverlayHistory } from '@/lib/overlayHistory';

function at(hash: string) {
    window.history.replaceState(null, '', `/admin${hash}`);
}

// jsdom fires popstate asynchronously after a traversal, and a skip starts another; settle until no
// further popstate arrives.
async function settle() {
    let pops = 0;
    const onPop = () => (pops += 1);
    window.addEventListener('popstate', onPop);
    let seen = -1;
    while (seen !== pops) {
        seen = pops;
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    }
    window.removeEventListener('popstate', onPop);
}

async function goBack() {
    window.history.back();
    await settle();
}

async function goForward() {
    window.history.forward();
    await settle();
}

// Next's router writes each entry's state afresh once it has caught up with a hash change, dropping
// any key someone else wrote there with replaceState.
function dropCustomStateOnHashChange() {
    window.addEventListener('hashchange', () => {
        setTimeout(() => window.history.replaceState({ __NA: true }, '', window.location.href), 0);
    });
}

async function nextRouterCommit() {
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
}

function linkClick(id: string) {
    const link = document.createElement('a');
    link.dataset.recordId = id;
    return { currentTarget: link, preventDefault: vi.fn() } as unknown as MouseEvent<HTMLAnchorElement>;
}

describe('useCampaignsPage', () => {
    beforeEach(() => {
        at('#campaigns');
    });
    beforeAll(() => {
        dropCustomStateOnHashChange();
    });
    afterEach(cleanup);

    it('opens on Current with the last 30 days', () => {
        const { result } = renderHook(() => useCampaignsPage());

        expect(result.current.tab).toBe('current');
        expect(result.current.campaignId).toBeNull();
        expect(result.current.range.preset).toBe('LAST_30');
    });

    it('keeps the Past tab in the address', () => {
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.handleTabChange('past'));

        expect(window.location.hash).toBe('#campaigns/past');
        expect(result.current.tab).toBe('past');
    });

    it('reads a campaign from the address', () => {
        at('#campaigns/7f1c');
        const { result } = renderHook(() => useCampaignsPage());

        expect(result.current.campaignId).toBe('7f1c');
    });

    it('treats the old new-link address as the list', () => {
        at('#campaigns/new');
        const { result } = renderHook(() => useCampaignsPage());

        expect(result.current.campaignId).toBeNull();
        expect(result.current.tab).toBe('current');
    });

    it('goes back to the tab its Back link names', () => {
        at('#campaigns/7f1c');
        const { result } = renderHook(() => useCampaignsPage());
        const event = { preventDefault: vi.fn(), currentTarget: { hash: result.current.tabHref('past') } } as unknown as MouseEvent<HTMLAnchorElement>;

        act(() => result.current.handleBackClick(event));

        expect(event.preventDefault).toHaveBeenCalled();
        expect(window.location.hash).toBe('#campaigns/past');
        expect(result.current.campaignId).toBeNull();
    });

    it('keeps one range for the list and the campaign page', () => {
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.range.setPreset('LAST_90'));
        act(() => {
            window.location.hash = '#campaigns/7f1c';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        expect(result.current.campaignId).toBe('7f1c');
        expect(result.current.range.preset).toBe('LAST_90');
    });

    it('opens one drawer at a time, each opening fresh', () => {
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.openNewCampaign());
        const first = result.current.drawers.token;
        act(() => result.current.drawers.close());
        act(() => result.current.openNewCampaign());

        expect(result.current.drawers.drawer).toBe('new');
        expect(result.current.drawers.token).toBeGreaterThan(first);
    });

    it('opens a new campaign on its page', () => {
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.openNewCampaign());
        act(() => result.current.openCampaign('c-new'));

        expect(result.current.drawers.drawer).toBeNull();
        expect(window.location.hash).toBe('#campaigns/c-new');
    });

    it('goes Back from a new campaign to the list it was made from, with no step in between', async () => {
        at('#analytics');
        window.history.pushState(null, '', '/admin#campaigns');
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.openNewCampaign());
        // The drawer's own Back step, as AdminDrawer makes it.
        const drawer = registerOverlayHistory({ id: 'new-drawer', onClose: vi.fn() });
        act(() => result.current.openCampaign('c-new'));
        // The drawer closes once the page renders without it.
        drawer.remove();
        await settle();
        expect(window.location.hash).toBe('#campaigns/c-new');

        await goBack();
        expect(window.location.hash).toBe('#campaigns');
        await goBack();
        expect(window.location.hash).toBe('#analytics');
    });

    it('goes Back from a deleted campaign to the list it was opened from, with nothing left to go Forward to', async () => {
        at('#analytics');
        window.history.pushState(null, '', '/admin#campaigns');
        const { result } = renderHook(() => useCampaignsPage());
        act(() => result.current.handleRecordLinkClick(linkClick('c-1')));
        expect(window.location.hash).toBe('#campaigns/c-1');
        await nextRouterCommit();

        // The edit drawer and its delete confirmation each add a Back step.
        act(() => result.current.drawers.openEdit());
        const drawer = registerOverlayHistory({ id: 'edit-drawer', onClose: vi.fn() });
        const confirm = registerOverlayHistory({ id: 'confirm', onClose: vi.fn() });
        act(() => result.current.drawers.handleDeleted());
        confirm.remove();
        drawer.remove();
        await settle();

        expect(window.location.hash).toBe('#campaigns');
        expect(result.current.campaignId).toBeNull();
        expect(result.current.drawers.drawer).toBeNull();
        await goForward();
        expect(window.location.hash).toBe('#campaigns');
        await goBack();
        expect(window.location.hash).toBe('#analytics');
    });

    it('skips a leftover Back step of a drawer closed earlier on a deleted campaign', async () => {
        at('#analytics');
        window.history.pushState(null, '', '/admin#campaigns');
        const { result } = renderHook(() => useCampaignsPage());
        act(() => result.current.handleRecordLinkClick(linkClick('c-2')));
        await nextRouterCommit();

        // The links drawer, closed with its X, leaves its entry behind.
        act(() => result.current.drawers.openLinks());
        registerOverlayHistory({ id: 'links-drawer', onClose: vi.fn() }).remove();
        act(() => result.current.drawers.openEdit());
        const drawer = registerOverlayHistory({ id: 'edit-drawer', onClose: vi.fn() });
        const confirm = registerOverlayHistory({ id: 'confirm', onClose: vi.fn() });
        act(() => result.current.drawers.handleDeleted());
        confirm.remove();
        drawer.remove();
        await settle();

        expect(window.location.hash).toBe('#campaigns');
        await goBack();
        expect(window.location.hash).toBe('#analytics');
    });

    it('turns a deleted campaign opened by its address into the list, with no Back step to it', async () => {
        at('#analytics');
        window.history.pushState(null, '', '/admin#campaigns/c-3');
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.drawers.openEdit());
        const drawer = registerOverlayHistory({ id: 'edit-drawer', onClose: vi.fn() });
        const confirm = registerOverlayHistory({ id: 'confirm', onClose: vi.fn() });
        act(() => result.current.drawers.handleDeleted());
        confirm.remove();
        drawer.remove();
        await settle();

        expect(window.location.hash).toBe('#campaigns');
        expect(result.current.campaignId).toBeNull();
        await goBack();
        expect(window.location.hash).toBe('#analytics');
    });

    it('goes back to the list once a campaign is deleted', () => {
        at('#campaigns/7f1c');
        const { result } = renderHook(() => useCampaignsPage());

        act(() => result.current.drawers.openEdit());
        act(() => result.current.drawers.handleDeleted());

        expect(result.current.drawers.drawer).toBeNull();
        expect(result.current.campaignId).toBeNull();
    });
});
