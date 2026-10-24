import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrintListDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

import { printListKeys, useAddHostPrintItems, useHostPrintList, usePatchPrintItem, useRemovePrintItem } from '@/hooks/usePrintLists';

const list: PrintListDto = {
    id: 'l1',
    vendorId: 'v1',
    ownerKind: 'HOST',
    status: 'OPEN',
    sentAt: null,
    ownerName: null,
    contactEmail: null,
    contactPhone: null,
    totalCents: null,
    removedCount: 0,
    items: [{ id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: null, sizeLabel: null, unitPriceCents: null, copies: 1 }],
};

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

describe('usePrintLists', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the host list for one photographer', async () => {
        api.get.mockResolvedValue(list);
        const { wrapper } = setup();
        const { result } = renderHook(() => useHostPrintList('e1', 'v1', true), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual(list));
        expect(api.get).toHaveBeenCalledWith('/api/events/e1/print-lists/host?vendorId=v1');
    });

    it('puts the server list in the cache after adding', async () => {
        api.post.mockResolvedValue(list);
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m1'] }));
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/host/items', { vendorId: 'v1', mediaIds: ['m1'] });
        expect(queryClient.getQueryData(printListKeys.host('e1', 'v1'))).toEqual(list);
    });

    it('changes copies at once and rolls back on failure', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.host('e1', 'v1'), list);
        let fail: (error: Error) => void = () => undefined;
        api.patch.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
        const { result } = renderHook(() => usePatchPrintItem('e1', printListKeys.host('e1', 'v1')), { wrapper });
        const pending = result.current.mutateAsync({ itemId: 'i1', patch: { copies: 3 } }).catch(() => undefined);
        await waitFor(() => expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items[0].copies).toBe(3));
        fail(new Error('nope'));
        await pending;
        expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items[0].copies).toBe(1);
    });

    it('removes a pick at once', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.host('e1', 'v1'), list);
        api.del.mockResolvedValue({ ...list, items: [] });
        const { result } = renderHook(() => useRemovePrintItem('e1', printListKeys.host('e1', 'v1')), { wrapper });
        await act(() => result.current.mutateAsync('i1'));
        expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items).toEqual([]);
    });
});
