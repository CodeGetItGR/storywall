import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { role: 'USER' } as { role: string } | null }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user) }) }));

import { useCreateVendorService, useDeleteVendorService, useUpdateVendorService, useVendorServices, vendorServiceKeys } from '@/hooks/useVendorServices';
import { ApiError } from '@/lib/api/client';

const size = { id: 's1', kind: 'PRINT', label: '13x18', priceCents: 300, currency: 'EUR', sortOrder: 0 };
const big = { id: 's2', kind: 'PRINT', label: '20x30', priceCents: 900, currency: 'EUR', sortOrder: 1 };

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

const contextKey = ['events', 'e1', 'print-picks'];
const otherContextKey = ['events', 'e2', 'print-picks'];
const hostListKey = ['events', 'e1', 'print-lists', 'host', 'v1'];
const vendorsKey = ['events', 'e1', 'vendors', 'list'];

function seed(queryClient: QueryClient, services: unknown[] = []) {
    queryClient.setQueryData(vendorServiceKeys.mine, services);
    queryClient.setQueryData(contextKey, { guestScope: 'OFF', photographers: [] });
    queryClient.setQueryData(otherContextKey, { guestScope: 'OFF', photographers: [] });
    queryClient.setQueryData(hostListKey, { id: null, items: [] });
    queryClient.setQueryData(vendorsKey, []);
}

function expectPrintQueriesRefreshed(queryClient: QueryClient) {
    expect(queryClient.getQueryState(contextKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherContextKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(hostListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(vendorsKey)?.isInvalidated).toBe(false);
}

describe('useVendorServices', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.user = { role: 'USER' };
    });

    it('stays idle when not enabled', () => {
        const { wrapper } = setup();
        const off = renderHook(() => useVendorServices(false), { wrapper });
        expect(off.result.current.fetchStatus).toBe('idle');
        expect(api.get).not.toHaveBeenCalled();
    });

    it('reads the profile services when enabled', async () => {
        api.get.mockResolvedValue([size]);
        const { wrapper } = setup();
        const on = renderHook(() => useVendorServices(true), { wrapper });
        await waitFor(() => expect(on.result.current.data).toEqual([size]));
        expect(api.get).toHaveBeenCalledWith('/api/me/vendor-profile/services');
    });

    it.each([null, { role: 'GUEST' }])('stays idle for %o even when enabled', (user) => {
        auth.user = user;
        const { wrapper } = setup();
        const { result } = renderHook(() => useVendorServices(true), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(api.get).not.toHaveBeenCalled();
    });

    it('puts the created size in the list in order and refreshes the print queries', async () => {
        api.post.mockResolvedValue(size);
        const { queryClient, wrapper } = setup();
        seed(queryClient, [big]);
        const create = renderHook(() => useCreateVendorService(), { wrapper });
        const body = { kind: 'PRINT' as const, label: '13x18', priceCents: 300 };
        await act(() => create.result.current.mutateAsync(body));
        expect(api.post).toHaveBeenCalledWith('/api/me/vendor-profile/services', body);
        expect(queryClient.getQueryData(vendorServiceKeys.mine)).toEqual([size, big]);
        expectPrintQueriesRefreshed(queryClient);
    });

    it('puts the updated size in the list and refreshes the print queries', async () => {
        const updated = { ...size, label: '15x21', priceCents: 400 };
        api.put.mockResolvedValue(updated);
        const { queryClient, wrapper } = setup();
        seed(queryClient, [size, big]);
        const update = renderHook(() => useUpdateVendorService(), { wrapper });
        const body = { kind: 'PRINT' as const, label: '15x21', priceCents: 400 };
        await act(() => update.result.current.mutateAsync({ id: 's1', body }));
        expect(api.put).toHaveBeenCalledWith('/api/me/vendor-profile/services/s1', body);
        expect(queryClient.getQueryData(vendorServiceKeys.mine)).toEqual([updated, big]);
        expectPrintQueriesRefreshed(queryClient);
    });

    it('removes the deleted size from the list and refreshes the print queries', async () => {
        api.del.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        seed(queryClient, [size, big]);
        const remove = renderHook(() => useDeleteVendorService(), { wrapper });
        await act(() => remove.result.current.mutateAsync('s1'));
        expect(api.del).toHaveBeenCalledWith('/api/me/vendor-profile/services/s1');
        expect(queryClient.getQueryData(vendorServiceKeys.mine)).toEqual([big]);
        expectPrintQueriesRefreshed(queryClient);
    });

    it('drops a size the server no longer has and re-reads the list', async () => {
        api.del.mockRejectedValue(new ApiError(404, null));
        api.get.mockResolvedValue([big]);
        const { queryClient, wrapper } = setup();
        seed(queryClient, [size, big]);
        const remove = renderHook(() => useDeleteVendorService(), { wrapper });
        await act(() => remove.result.current.mutateAsync('s1').catch(() => undefined));
        expect(queryClient.getQueryData(vendorServiceKeys.mine)).toEqual([big]);
        expect(queryClient.getQueryState(vendorServiceKeys.mine)?.isInvalidated).toBe(true);
    });

    it('re-reads the list when a save fails', async () => {
        api.put.mockRejectedValue(new ApiError(403, null));
        const { queryClient, wrapper } = setup();
        seed(queryClient, [size]);
        const update = renderHook(() => useUpdateVendorService(), { wrapper });
        await act(() => update.result.current.mutateAsync({ id: 's1', body: { kind: 'PRINT', label: 'x', priceCents: 1 } }).catch(() => undefined));
        expect(queryClient.getQueryState(vendorServiceKeys.mine)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryData(vendorServiceKeys.mine)).toEqual([size]);
    });
});
