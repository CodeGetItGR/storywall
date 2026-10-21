import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorMePage } from '@/hooks/useVendorMePage';

const patch = vi.fn();
const role = vi.hoisted(() => ({ data: null as Record<string, unknown> | null, isLoading: false }));
const event = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: () => role,
    usePatchVendor: () => ({ mutateAsync: patch, isPending: false }),
}));
vi.mock('@/hooks/useVendorProfile', () => ({
    useVendorProfile: () => ({ data: { businessName: 'DJ Nik', vendorType: 'MUSIC', link: '@djnik', logoUrl: null, partnerPromptDismissed: false } }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => event.value }));

const DJ = {
    vendorId: 'v1',
    vendorType: 'MUSIC',
    capabilities: ['SONG_REQUESTS'],
    accessEndsAt: '2027-07-12T00:00:00Z',
    accessOpen: true,
    profileComplete: true,
    showPartnerPrompt: true,
    proStorageBytes: null,
    proUsedBytes: null,
    optedOut: false,
    hiddenByHost: false,
    toolsOff: null,
};

function eventWith(...moduleKeys: string[]) {
    return {
        id: 'e1',
        status: 'ACTIVE',
        deletedAt: null,
        modules: moduleKeys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} })),
    };
}

beforeEach(() => {
    patch.mockReset();
    role.data = DJ;
    role.isLoading = false;
    event.value = eventWith('vendors', 'playlist', 'gallery');
});

describe('useVendorMePage', () => {
    it('exposes the role, the tools and the list state', () => {
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.me).toEqual(DJ);
        expect(result.current.tools.map((tool) => tool.key)).toEqual(['liveRequests']);
        expect(result.current.hasProAlbum).toBe(false);
        expect(result.current.canUploadPro).toBe(false);
        expect(result.current.canChooseListing).toBe(true);
        expect(result.current.listed).toBe(true);
        expect(result.current.showPartnerPrompt).toBe(true);
    });

    it('opts out and back in', async () => {
        patch.mockResolvedValue({});
        const { result } = renderHook(() => useVendorMePage('e1'));
        await act(() => result.current.toggleListed());
        expect(patch).toHaveBeenCalledWith({ vendorId: 'v1', patch: { optedOut: true } });
        role.data = { ...DJ, optedOut: true };
        const again = renderHook(() => useVendorMePage('e1'));
        await act(() => again.result.current.toggleListed());
        expect(patch).toHaveBeenLastCalledWith({ vendorId: 'v1', patch: { optedOut: false } });
    });

    it('shows the error when the switch fails', async () => {
        patch.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useVendorMePage('e1'));
        await act(() => result.current.toggleListed());
        expect(result.current.error).toBe('failed');
    });

    it('has no tools or prompt for someone who is not a vendor', () => {
        role.data = null;
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.me).toBeNull();
        expect(result.current.tools).toEqual([]);
        expect(result.current.showPartnerPrompt).toBe(false);
    });

    it('keeps the Pro album for a photographer while the gallery and vendors modules are readable', () => {
        role.data = { ...DJ, vendorType: 'PHOTOGRAPHER', capabilities: ['PRO_ALBUM'] };
        expect(renderHook(() => useVendorMePage('e1')).result.current.hasProAlbum).toBe(true);
        expect(renderHook(() => useVendorMePage('e1')).result.current.canUploadPro).toBe(true);

        // After the window (capabilities empty) the album stays, the upload closes.
        role.data = { ...DJ, vendorType: 'PHOTOGRAPHER', capabilities: [], accessOpen: false, toolsOff: 'ACCESS_ENDED' };
        const closed = renderHook(() => useVendorMePage('e1')).result.current;
        expect(closed.hasProAlbum).toBe(true);
        expect(closed.canUploadPro).toBe(false);
        expect(closed.tools).toEqual([]);

        event.value = eventWith('vendors');
        expect(renderHook(() => useVendorMePage('e1')).result.current.hasProAlbum).toBe(false);
    });

    it('hides the module-gated sections when the vendors module is off', () => {
        role.data = { ...DJ, vendorType: 'PHOTOGRAPHER', capabilities: [], accessOpen: false, accessEndsAt: null, toolsOff: 'MODULE_OFF' };
        event.value = eventWith('gallery');
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.me).not.toBeNull();
        expect(result.current.hasProAlbum).toBe(false);
        expect(result.current.canChooseListing).toBe(false);
        expect(result.current.tools).toEqual([]);
    });

    it('leaves out a tool whose module is off', () => {
        event.value = eventWith('vendors');
        const { result } = renderHook(() => useVendorMePage('e1'));
        expect(result.current.tools).toEqual([]);
    });
});
