import { act, cleanup, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignsPage } from '@/hooks/useCampaignsPage';

function at(hash: string) {
    window.history.replaceState(null, '', `/admin${hash}`);
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
});
