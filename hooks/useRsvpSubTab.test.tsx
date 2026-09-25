import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpSubTab } from '@/hooks/useRsvpSubTab';

let search = '';
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/manage',
    useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
    search = '';
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

describe('useRsvpSubTab', () => {
    it('opens on stats', () => {
        expect(renderHook(() => useRsvpSubTab()).result.current.subTab).toBe('stats');
    });

    it('opens on the sub-tab in the URL', () => {
        search = 'tab=rsvp&section=reports';
        expect(renderHook(() => useRsvpSubTab()).result.current.subTab).toBe('reports');
    });

    // ManageScreen keeps ?section= when switching tabs, so Members' "coHosts" can arrive here.
    it('ignores a section it does not know', () => {
        search = 'tab=rsvp&section=coHosts';
        expect(renderHook(() => useRsvpSubTab()).result.current.subTab).toBe('stats');
    });

    it('writes the sub-tab to the URL, keeping the other params', () => {
        search = 'tab=rsvp';
        const { result } = renderHook(() => useRsvpSubTab());

        result.current.setSubTab('reports');

        expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/events/e1/manage?tab=rsvp&section=reports');
    });

    it('drops the param for the default sub-tab', () => {
        search = 'tab=rsvp&section=list';
        const { result } = renderHook(() => useRsvpSubTab());

        result.current.setSubTab('stats');

        expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/events/e1/manage?tab=rsvp');
    });

    it('does nothing when the sub-tab is already active', () => {
        search = 'tab=rsvp&section=reports';
        const { result } = renderHook(() => useRsvpSubTab());

        result.current.setSubTab('reports');

        expect(window.history.replaceState).not.toHaveBeenCalled();
    });
});
