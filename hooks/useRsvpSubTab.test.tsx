import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpSubTab } from '@/hooks/useRsvpSubTab';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace }),
    usePathname: () => '/events/e1/manage',
    useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
    replace.mockReset();
    search = '';
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

        act(() => result.current.setSubTab('reports'));

        expect(replace).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp&section=reports', { scroll: false });
    });

    it('drops the param for the default sub-tab', () => {
        search = 'tab=rsvp&section=list';
        const { result } = renderHook(() => useRsvpSubTab());

        act(() => result.current.setSubTab('stats'));

        expect(replace).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp', { scroll: false });
    });
});
