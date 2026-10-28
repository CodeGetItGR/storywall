import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageVendors } from '@/hooks/useManageVendors';

const patch = vi.fn();
const remove = vi.fn();
const data = vi.hoisted(() => ({ vendors: [] as unknown[] }));
vi.mock('@/hooks/useVendors', () => ({
    useEventVendors: () => ({ data: data.vendors, isLoading: false }),
    usePatchVendor: () => ({ mutateAsync: patch, isPending: false, variables: undefined }),
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
    patch.mockReset();
    remove.mockReset();
    data.vendors = [DJ];
});

describe('useManageVendors', () => {
    it('hides and shows a vendor from its row, without opening the sheet', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => useManageVendors('e1'));
        await act(() => result.current.toggleHidden('v2'));
        expect(patch).toHaveBeenCalledWith({ vendorId: 'v2', patch: { hiddenByHost: true } });
        expect(result.current.selectedVendor).toBeNull();
    });

    it('shows a row action error above the list, and a sheet action error in the sheet', async () => {
        patch.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        await act(() => result.current.toggleHidden('v2'));
        expect(result.current.listError).toBe('failed');
        expect(result.current.sheetError).toBeNull();
        act(() => result.current.openVendor('v2'));
        await act(() => result.current.toggleHidden('v2'));
        expect(result.current.sheetError).toBe('failed');
        expect(result.current.listError).toBeNull();
    });

    it('removes a vendor from its row after the confirmation', async () => {
        remove.mockResolvedValue(undefined);
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.requestRemove('v2'));
        expect(result.current.removeTarget).toEqual(DJ);
        await act(() => result.current.confirmRemove());
        expect(remove).toHaveBeenCalledWith('v2');
        expect(result.current.removeTarget).toBeNull();
    });

    it('closes the sheet after removing the open vendor', async () => {
        remove.mockResolvedValue(undefined);
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove('v2'));
        await act(() => result.current.confirmRemove());
        expect(result.current.selectedVendor).toBeNull();
    });

    it('shows the server error and keeps the sheet open when removing fails', async () => {
        remove.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useManageVendors('e1'));
        act(() => result.current.openVendor('v2'));
        act(() => result.current.requestRemove('v2'));
        await act(() => result.current.confirmRemove());
        expect(result.current.sheetError).toBe('failed');
        expect(result.current.selectedVendor).toEqual(DJ);
    });
});
