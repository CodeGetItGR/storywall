import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageVendors } from '@/hooks/useManageVendors';

const reset = vi.fn();
const patch = vi.fn();
const remove = vi.fn();
const data = vi.hoisted(() => ({ links: [] as unknown[], vendors: [] as unknown[] }));
vi.mock('@/hooks/useVendors', () => ({
    useVendorLinks: () => ({ data: data.links, isLoading: false }),
    useEventVendors: () => ({ data: data.vendors, isLoading: false }),
    useResetVendorLink: () => ({ mutateAsync: reset, isPending: false }),
    usePatchVendor: () => ({ mutateAsync: patch, isPending: false }),
    useRemoveVendor: () => ({ mutateAsync: remove, isPending: false }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

const DJ = {
    id: 'v2',
    memberId: 'm2',
    vendorType: 'MUSIC',
    businessName: 'DJ Nik',
    link: '@djnik',
    logoUrl: null,
    joinedAt: '2026-10-01T10:00:00Z',
    hiddenByHost: false,
    optedOut: false,
};

beforeEach(() => {
    reset.mockReset();
    patch.mockReset();
    remove.mockReset();
    data.links = [
        { vendorType: 'MUSIC', inviteToken: 't-music' },
        { vendorType: 'PLANNER', inviteToken: 't-planner' },
    ];
    data.vendors = [DJ];
});

describe('useManageVendors', () => {
    it('orders the links by type', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        expect(result.current.links.map((link) => link.vendorType)).toEqual(['PLANNER', 'MUSIC']);
    });

    it('resets a link only after the confirmation', async () => {
        reset.mockResolvedValue({});
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        expect(result.current.resetType).toBe('MUSIC');
        expect(reset).not.toHaveBeenCalled();
        await act(() => result.current.confirmReset());
        expect(reset).toHaveBeenCalledWith('MUSIC');
        expect(result.current.resetType).toBeNull();
    });

    it('cancelling a reset sends nothing', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        act(() => result.current.cancelReset());
        expect(result.current.resetType).toBeNull();
        expect(reset).not.toHaveBeenCalled();
    });

    it('a failed reset shows the error', async () => {
        reset.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestReset('MUSIC'));
        await act(() => result.current.confirmReset());
        expect(result.current.error).toBe('failed');
        expect(result.current.resetType).toBeNull();
    });

    it('hides and shows the open vendor', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        expect(result.current.selectedVendor).toEqual(DJ);
        await act(() => result.current.toggleHidden());
        expect(patch).toHaveBeenCalledWith({ vendorId: 'v2', patch: { hiddenByHost: true } });
    });

    it('removes the open vendor after the confirmation and closes the sheet', async () => {
        remove.mockResolvedValue(undefined);
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove());
        expect(result.current.removeOpen).toBe(true);
        await act(() => result.current.confirmRemove());
        expect(remove).toHaveBeenCalledWith('v2');
        expect(result.current.removeOpen).toBe(false);
        expect(result.current.selectedVendor).toBeNull();
    });

    it('shows the server error and keeps the sheet open when removing fails', async () => {
        remove.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove());
        await act(() => result.current.confirmRemove());
        expect(result.current.error).toBe('failed');
        expect(result.current.selectedVendor).toEqual(DJ);
    });

    it('opens the QR for one link', () => {
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openQr('PLANNER'));
        expect(result.current.qrLink?.inviteToken).toBe('t-planner');
        act(() => result.current.closeQr());
        expect(result.current.qrLink).toBeNull();
    });
});
