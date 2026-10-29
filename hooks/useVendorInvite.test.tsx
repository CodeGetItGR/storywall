import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorInvite } from '@/hooks/useVendorInvite';

const reset = vi.fn();
const data = vi.hoisted(() => ({ links: [] as unknown[] }));
vi.mock('@/hooks/useVendors', () => ({
    useVendorLinks: () => ({ data: data.links, isLoading: false }),
    useResetVendorLink: () => ({ mutateAsync: reset, isPending: false }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

beforeEach(() => {
    reset.mockReset();
    data.links = [
        { vendorType: 'MUSIC', inviteToken: 't-music' },
        { vendorType: 'PLANNER', inviteToken: 't-planner' },
    ];
});

describe('useVendorInvite', () => {
    it('orders the types and starts on the first one', () => {
        const { result } = renderHook(() => useVendorInvite('e1'));
        expect(result.current.links.map((link) => link.vendorType)).toEqual(['PLANNER', 'MUSIC']);
        expect(result.current.link?.inviteToken).toBe('t-planner');
    });

    it('opens, switches type and closes the QR on a switch', () => {
        const { result } = renderHook(() => useVendorInvite('e1'));
        act(() => result.current.openInvite());
        expect(result.current.open).toBe(true);
        act(() => result.current.toggleQr());
        expect(result.current.qrOpen).toBe(true);
        act(() => result.current.pickType('MUSIC'));
        expect(result.current.link?.inviteToken).toBe('t-music');
        expect(result.current.qrOpen).toBe(false);
        act(() => result.current.closeInvite());
        expect(result.current.open).toBe(false);
    });

    it('resets the shown link only after the confirmation', async () => {
        reset.mockResolvedValue({});
        const { result } = renderHook(() => useVendorInvite('e1'));
        act(() => result.current.pickType('MUSIC'));
        act(() => result.current.requestReset());
        expect(result.current.resetOpen).toBe(true);
        expect(reset).not.toHaveBeenCalled();
        await act(() => result.current.confirmReset());
        expect(reset).toHaveBeenCalledWith('MUSIC');
        expect(result.current.resetOpen).toBe(false);
    });

    it('cancelling a reset sends nothing', () => {
        const { result } = renderHook(() => useVendorInvite('e1'));
        act(() => result.current.requestReset());
        act(() => result.current.cancelReset());
        expect(result.current.resetOpen).toBe(false);
        expect(reset).not.toHaveBeenCalled();
    });

    it('a failed reset shows the error', async () => {
        reset.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useVendorInvite('e1'));
        act(() => result.current.requestReset());
        await act(() => result.current.confirmReset());
        expect(result.current.error).toBe('failed');
        expect(result.current.resetOpen).toBe(false);
    });
});
