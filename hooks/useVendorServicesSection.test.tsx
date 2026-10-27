import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorServicesSection } from '@/hooks/useVendorServicesSection';
import type { VendorMeDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ services: { value: {} as Record<string, unknown> }, create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: unknown) => `msg:${String(error)}` }));
vi.mock('@/hooks/useVendorServices', () => ({
    useVendorServices: () => mocks.services.value,
    useCreateVendorService: () => ({ mutateAsync: mocks.create, isPending: false }),
    useUpdateVendorService: () => ({ mutateAsync: mocks.update, isPending: false }),
    useDeleteVendorService: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

const me = { vendorType: 'PHOTOGRAPHER', approvedPartner: true } as unknown as VendorMeDto;
const size = { id: 's1', kind: 'PRINT' as const, label: '13x18', priceCents: 350, currency: 'EUR', sortOrder: 0 };

beforeEach(() => {
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.remove.mockReset();
    mocks.services.value = { data: [size], isLoading: false, isError: false, error: null };
});

describe('useVendorServicesSection', () => {
    it('keeps a save error in the sheet and out of the section', async () => {
        mocks.create.mockRejectedValue('boom');
        const { result } = renderHook(() => useVendorServicesSection(me, 'ready'));
        act(() => result.current.openNew());
        await act(() => result.current.save('10x15', 200));
        expect(result.current.sheetError).toBe('msg:boom');
        expect(result.current.sectionError).toBeNull();
        expect(result.current.editing).toBe('new');
    });

    it('clears the sheet error when the sheet closes', async () => {
        mocks.create.mockRejectedValue('boom');
        const { result } = renderHook(() => useVendorServicesSection(me, 'ready'));
        act(() => result.current.openNew());
        await act(() => result.current.save('10x15', 200));
        act(() => result.current.close());
        expect(result.current.sheetError).toBeNull();
        expect(result.current.sectionError).toBeNull();
    });

    it('keeps a failed delete in the sheet', async () => {
        mocks.remove.mockRejectedValue('gone');
        const { result } = renderHook(() => useVendorServicesSection(me, 'ready'));
        act(() => result.current.openEdit(size));
        act(() => result.current.requestDelete());
        await act(() => result.current.confirmRemove());
        expect(result.current.confirmDelete).toBe(false);
        expect(result.current.sheetError).toBe('msg:gone');
    });

    it('keeps showing the sizes it has when a refetch fails', () => {
        mocks.services.value = { data: [size], isLoading: false, isError: true, error: 'refetch' };
        const { result } = renderHook(() => useVendorServicesSection(me, 'ready'));
        expect(result.current.loadFailed).toBe(false);
        expect(result.current.sizes).toHaveLength(1);
        expect(result.current.sectionError).toBeNull();
    });

    it('reports a failed read in the section, not while a sheet is open', () => {
        mocks.services.value = { data: undefined, isLoading: false, isError: true, error: 'down' };
        const { result } = renderHook(() => useVendorServicesSection(me, 'ready'));
        expect(result.current.loadFailed).toBe(true);
        expect(result.current.sectionError).toBe('msg:down');
        act(() => result.current.openNew());
        expect(result.current.sectionError).toBeNull();
    });

    it('needs the profile before sizes can be added, and not while it loads', () => {
        const missing = renderHook(() => useVendorServicesSection(me, 'missing'));
        expect(missing.result.current.needsProfile).toBe(true);
        expect(missing.result.current.profileLoading).toBe(false);
        const loading = renderHook(() => useVendorServicesSection(me, 'loading'));
        expect(loading.result.current.needsProfile).toBe(false);
        expect(loading.result.current.profileLoading).toBe(true);
        const ready = renderHook(() => useVendorServicesSection(me, 'ready'));
        expect(ready.result.current.needsProfile).toBe(false);
        expect(ready.result.current.profileLoading).toBe(false);
    });
});
