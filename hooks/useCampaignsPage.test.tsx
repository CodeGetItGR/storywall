import { act, cleanup, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function linkClick(id: string) {
    const link = document.createElement('a');
    link.dataset.recordId = id;
    return { currentTarget: link, preventDefault: vi.fn() } as unknown as MouseEvent<HTMLAnchorElement>;
}

describe('useCampaignsPage', () => {
    beforeEach(() => {
        at('#campaigns');
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
        drawer.remove();
        expect(window.location.hash).toBe('#campaigns/c-new');

        await goBack();
        expect(window.location.hash).toBe('#campaigns');
        await goBack();
        expect(window.location.hash).toBe('#analytics');
    });

    it('leaves a deleted campaign with no Back step to it or to a second list', async () => {
        at('#analytics');
        window.history.pushState(null, '', '/admin#campaigns');
        const { result } = renderHook(() => useCampaignsPage());
        act(() => result.current.handleRecordLinkClick(linkClick('c-1')));
        expect(window.location.hash).toBe('#campaigns/c-1');

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
