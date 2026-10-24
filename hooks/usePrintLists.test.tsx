import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { PrintListDto, PrintListItemDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const download = vi.hoisted(() => ({ downloadBlob: vi.fn() }));
vi.mock('@/lib/download', () => download);

import {
    printListKeys,
    useAddHostPrintItems,
    useDownloadPrintListPart,
    useHostPrintList,
    usePatchPrintItem,
    usePrintListManifest,
    useRemovePrintItem,
    useSetPrintsIncluded,
} from '@/hooks/usePrintLists';

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

const second: PrintListItemDto = { ...list.items[0], id: 'i2', mediaId: 'm2' };
const twoItems: PrintListDto = { ...list, items: [list.items[0], second, { ...second, id: 'i3', mediaId: 'm3' }] };
const hostKey = printListKeys.host('e1', 'v1');

function deferred<T>() {
    let resolve: (value: T) => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('usePrintLists item edits', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refetches instead of overwriting an item edit still running after an add', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const pendingPatch = deferred<PrintListDto>();
        api.patch.mockReturnValue(pendingPatch.promise);
        api.post.mockResolvedValue(list);
        const patch = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        const add = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        const editing = patch.result.current.mutateAsync({ itemId: 'i1', patch: { copies: 4 } });
        await waitFor(() => expect(queryClient.isMutating()).toBe(1));
        await act(() => add.result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m9'] }));
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items).toHaveLength(3);
        pendingPatch.resolve(twoItems);
        await editing;
    });

    it('keeps the later change when two patches overlap', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const first = deferred<PrintListDto>();
        const last = deferred<PrintListDto>();
        api.patch.mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise);
        const { result } = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        const a = result.current.mutateAsync({ itemId: 'i1', patch: { copies: 2 } });
        const b = result.current.mutateAsync({ itemId: 'i1', patch: { copies: 3 } });
        await waitFor(() => expect(queryClient.isMutating()).toBe(2));
        const withCopies = (copies: number) => twoItems.items.map((item) => (item.id === 'i1' ? { ...item, copies } : item));
        first.resolve({ ...twoItems, items: withCopies(2) });
        await a;
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items[0].copies).toBe(3);
        last.resolve({ ...twoItems, items: withCopies(3) });
        await b;
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items[0].copies).toBe(3);
    });

    it('undoes only the failed patch', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const failing = deferred<PrintListDto>();
        api.patch.mockReturnValueOnce(failing.promise);
        api.del.mockResolvedValue({ ...twoItems, items: [twoItems.items[0], twoItems.items[2]] });
        const patch = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        const remove = renderHook(() => useRemovePrintItem('e1', hostKey), { wrapper });
        const pending = patch.result.current.mutateAsync({ itemId: 'i2', patch: { copies: 5 } }).catch(() => undefined);
        await waitFor(() => expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items[1].copies).toBe(5));
        await act(() => remove.result.current.mutateAsync('i2'));
        failing.reject(new Error('nope'));
        await pending;
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items.map((item) => item.id)).toEqual(['i1', 'i3']);
    });

    it('puts a failed removal back where it was', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const failing = deferred<PrintListDto>();
        api.del.mockReturnValue(failing.promise);
        const { result } = renderHook(() => useRemovePrintItem('e1', hostKey), { wrapper });
        const pending = result.current.mutateAsync('i2').catch(() => undefined);
        await waitFor(() => expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items).toHaveLength(2));
        failing.reject(new ApiError(500, null));
        await pending;
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items.map((item) => item.id)).toEqual(['i1', 'i2', 'i3']);
    });

    it('keeps the removal when the pick is already gone', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const failing = deferred<PrintListDto>();
        api.del.mockReturnValue(failing.promise);
        const { result } = renderHook(() => useRemovePrintItem('e1', hostKey), { wrapper });
        const pending = result.current.mutateAsync('i2').catch((error: unknown) => error);
        await waitFor(() => expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items).toHaveLength(2));
        failing.reject(new ApiError(404, null));
        expect(await pending).toBeInstanceOf(ApiError);
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items.map((item) => item.id)).toEqual(['i1', 'i3']);
    });

    it('hands the ApiError to the caller', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        api.patch.mockRejectedValue(new ApiError(409, null));
        const { result } = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        await expect(result.current.mutateAsync({ itemId: 'i1', patch: { copies: 2 } })).rejects.toMatchObject({ status: 409 });
    });

    it('refreshes the context after setting prints included', async () => {
        api.patch.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useSetPrintsIncluded('e1'), { wrapper });
        await act(() => result.current.mutateAsync(40));
        expect(api.patch).toHaveBeenCalledWith('/api/events/e1/vendors/me/prints-included', { count: 40 });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: printListKeys.context('e1') });
    });
});

describe('usePrintLists download', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the manifest, including an empty one', async () => {
        api.get.mockResolvedValue({ parts: [] });
        const { wrapper } = setup();
        const { result } = renderHook(() => usePrintListManifest('e1', 'l1'), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual({ parts: [] }));
        expect(api.get).toHaveBeenCalledWith('/api/events/e1/print-lists/l1/archive/manifest');
    });

    it('downloads one part under the server file name', async () => {
        const blob = new Blob(['zip']);
        api.download.mockResolvedValue({
            blob: () => Promise.resolve(blob),
            headers: new Headers({ 'Content-Disposition': 'attachment; filename="prints-host-2.zip"' }),
        });
        const { wrapper } = setup();
        const { result } = renderHook(() => useDownloadPrintListPart('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ listId: 'l1', part: 2, fileStem: 'prints-host' }));
        expect(api.download).toHaveBeenCalledWith('/api/events/e1/print-lists/l1/archive?part=2');
        expect(download.downloadBlob).toHaveBeenCalledWith(blob, 'prints-host-2.zip');
    });

    it('refreshes the manifest when the part is gone', async () => {
        api.download.mockRejectedValue(new ApiError(400, { errorCode: 3019 }));
        const { queryClient, wrapper } = setup();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useDownloadPrintListPart('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ listId: 'l1', part: 3, fileStem: 'prints-host' }).catch(() => undefined));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: printListKeys.archive('e1', 'l1'), exact: true });
    });

    it('falls back to a stem-based name', async () => {
        api.download.mockResolvedValue({ blob: () => Promise.resolve(new Blob()), headers: new Headers() });
        const { wrapper } = setup();
        const { result } = renderHook(() => useDownloadPrintListPart('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ listId: 'l1', part: 1, fileStem: 'prints-host' }));
        expect(download.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'prints-host-1.zip');
    });
});

describe('usePrintLists overlapping writes', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refetches instead of overwriting a removal still running after an add', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const pendingRemoval = deferred<PrintListDto>();
        api.del.mockReturnValue(pendingRemoval.promise);
        api.post.mockResolvedValue(list);
        const remove = renderHook(() => useRemovePrintItem('e1', hostKey), { wrapper });
        const add = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        const removing = remove.result.current.mutateAsync('i2');
        await waitFor(() => expect(queryClient.isMutating()).toBe(1));
        await act(() => add.result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m9'] }));
        // The add's list was not written over the removal; the removal reconciles the list when it ends.
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items.map((item) => item.id)).toEqual(['i1', 'i3']);
        pendingRemoval.resolve({ ...twoItems, items: [twoItems.items[0], twoItems.items[2]] });
        await act(() => removing);
        expect(queryClient.getQueryState(hostKey)?.isInvalidated).toBe(true);
    });

    it('does not write a removal answer over an add still running', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const pendingAdd = deferred<PrintListDto>();
        api.post.mockReturnValue(pendingAdd.promise);
        api.del.mockResolvedValue({ ...list, items: [] });
        const remove = renderHook(() => useRemovePrintItem('e1', hostKey), { wrapper });
        const add = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        const adding = add.result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m9'] });
        await waitFor(() => expect(queryClient.isMutating()).toBe(1));
        await act(() => remove.result.current.mutateAsync('i2'));
        expect(queryClient.getQueryData<PrintListDto>(hostKey)?.items.map((item) => item.id)).toEqual(['i1', 'i3']);
        pendingAdd.resolve(twoItems);
        await adding;
    });

    it('refetches when an edit ends first and the add answers without it', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const pendingAdd = deferred<PrintListDto>();
        api.post.mockReturnValue(pendingAdd.promise);
        api.patch.mockResolvedValue({ ...twoItems, items: twoItems.items.map((item) => (item.id === 'i1' ? { ...item, copies: 4 } : item)) });
        const patch = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        const add = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        const adding = add.result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m9'] });
        await waitFor(() => expect(queryClient.isMutating()).toBe(1));
        await act(() => patch.result.current.mutateAsync({ itemId: 'i1', patch: { copies: 4 } }));
        // The edit ended while the add ran, so it left the final write to the add.
        pendingAdd.resolve(twoItems);
        await act(() => adding);
        expect(queryClient.getQueryState(hostKey)?.isInvalidated).toBe(true);
    });

    it('does not let a running add for another photographer block an edit', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(hostKey, twoItems);
        const pendingAdd = deferred<PrintListDto>();
        api.post.mockReturnValue(pendingAdd.promise);
        const serverList = { ...twoItems, items: twoItems.items.map((item) => (item.id === 'i1' ? { ...item, copies: 4 } : item)) };
        api.patch.mockResolvedValue(serverList);
        const patch = renderHook(() => usePatchPrintItem('e1', hostKey), { wrapper });
        const add = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        const adding = add.result.current.mutateAsync({ vendorId: 'v2', mediaIds: ['m9'] });
        await waitFor(() => expect(queryClient.isMutating()).toBe(1));
        await act(() => patch.result.current.mutateAsync({ itemId: 'i1', patch: { copies: 4 } }));
        expect(queryClient.getQueryData(hostKey)).toEqual(serverList);
        expect(queryClient.getQueryState(hostKey)?.isInvalidated).toBe(true);
        pendingAdd.resolve(list);
        await act(() => adding);
    });

    it('refreshes the context when the photographer access has ended', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.context('e1'), { guestScope: 'OFF', photographers: [] });
        api.post.mockRejectedValue(new ApiError(403, { errorCode: 4033 }));
        const { result } = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m1'] }).catch(() => undefined));
        expect(queryClient.getQueryState(printListKeys.context('e1'))?.isInvalidated).toBe(true);
    });
});
