import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorPrintsSection } from '@/hooks/useVendorPrintsSection';
import type { VendorMeDto } from '@/lib/api/types';

const invalidate = vi.fn();
const mocks = vi.hoisted(() => ({
    context: { value: {} as Record<string, unknown> },
    hostList: { value: {} as Record<string, unknown> },
    manifest: { value: {} as Record<string, unknown> },
    setIncluded: vi.fn(),
    download: vi.fn(),
    manifestArgs: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: unknown) => `msg:${String(error)}` }));
vi.mock('@/hooks/usePrintLists', () => ({
    printListKeys: { archive: (e: string, l: string) => ['archive', e, l] },
    usePrintPicksContext: () => mocks.context.value,
    useHostPrintList: () => mocks.hostList.value,
    usePrintListManifest: (...args: unknown[]) => {
        mocks.manifestArgs(...args);
        return mocks.manifest.value;
    },
    useSetPrintsIncluded: () => ({ mutateAsync: mocks.setIncluded, isPending: false }),
    useDownloadPrintListPart: () => ({ mutateAsync: mocks.download, isPending: false, variables: undefined }),
}));

const me = { vendorId: 'v1', accessOpen: true, capabilities: ['PRINT_PICKS'] } as unknown as VendorMeDto;
const item = { id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: null, sizeLabel: null, unitPriceCents: null, copies: 2 };

function list(updatedAt: number, items = [item]) {
    return { data: { id: 'l1', items, removedCount: 0 }, dataUpdatedAt: updatedAt, isLoading: false, error: null };
}

beforeEach(() => {
    invalidate.mockReset();
    mocks.setIncluded.mockReset();
    mocks.download.mockReset();
    mocks.manifestArgs.mockReset();
    mocks.context.value = { data: { photographers: [{ vendorId: 'v1', hostPrintsIncluded: 5 }] }, isLoading: false, error: null };
    mocks.hostList.value = list(1);
    mocks.manifest.value = { data: { parts: [{ part: 1 }] }, isLoading: false, error: null };
});

describe('useVendorPrintsSection', () => {
    it('reads the manifest once on the first load and again only when the same list changes', () => {
        const { rerender } = renderHook(() => useVendorPrintsSection('e1', me));
        expect(invalidate).not.toHaveBeenCalled();
        rerender();
        expect(invalidate).not.toHaveBeenCalled();
        mocks.hostList.value = list(2);
        rerender();
        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['archive', 'e1', 'l1'], exact: true });
    });

    it('does not ask for the parts of a list with no picks', () => {
        mocks.hostList.value = list(1, []);
        renderHook(() => useVendorPrintsSection('e1', me));
        expect(mocks.manifestArgs).toHaveBeenLastCalledWith(null, 'l1');
    });

    it('keeps a save error in the sheet only', async () => {
        mocks.setIncluded.mockRejectedValue('boom');
        const { result } = renderHook(() => useVendorPrintsSection('e1', me));
        act(() => result.current.openIncluded());
        await act(() => result.current.saveIncluded(3));
        expect(result.current.sheetError).toBe('msg:boom');
        expect(result.current.sectionError).toBeNull();
        act(() => result.current.closeIncluded());
        expect(result.current.sectionError).toBeNull();
    });

    it('keeps a download error in the section, and hides it while the sheet is open', async () => {
        mocks.download.mockRejectedValue('nope');
        const { result } = renderHook(() => useVendorPrintsSection('e1', me));
        await act(() => result.current.downloadHostPart(1));
        expect(result.current.sectionError).toBe('msg:nope');
        expect(result.current.sheetError).toBeNull();
        act(() => result.current.openIncluded());
        expect(result.current.sectionError).toBeNull();
    });

    it('reports a failed read instead of an empty list or 0 included', () => {
        mocks.hostList.value = { data: undefined, dataUpdatedAt: 0, isLoading: false, error: 'down' };
        const { result } = renderHook(() => useVendorPrintsSection('e1', me));
        expect(result.current.loadFailed).toBe(true);
        expect(result.current.sectionError).toBe('msg:down');
    });

    it('reports a failed manifest', () => {
        mocks.manifest.value = { data: undefined, isLoading: false, error: 'parts' };
        const { result } = renderHook(() => useVendorPrintsSection('e1', me));
        expect(result.current.sectionError).toBe('msg:parts');
    });
});
