import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

import { useCreateVendorService, useDeleteVendorService, useUpdateVendorService, useVendorServices, vendorServiceKeys } from '@/hooks/useVendorServices';

const size = { id: 's1', kind: 'PRINT', label: '13x18', priceCents: 300, currency: 'EUR', sortOrder: 0 };

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

const contextKey = ['events', 'e1', 'print-picks'];
const hostListKey = ['events', 'e1', 'print-lists', 'host', 'v1'];

function seed(queryClient: QueryClient) {
    queryClient.setQueryData(vendorServiceKeys.mine, []);
    queryClient.setQueryData(contextKey, { guestScope: 'OFF', photographers: [] });
    queryClient.setQueryData(hostListKey, { id: null, items: [] });
    queryClient.setQueryData(['events', 'e1', 'posts'], []);
}

function expectRefreshed(queryClient: QueryClient) {
    expect(queryClient.getQueryState(vendorServiceKeys.mine)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(contextKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(hostListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['events', 'e1', 'posts'])?.isInvalidated).toBe(false);
}

describe('useVendorServices', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the profile services only when enabled', async () => {
        api.get.mockResolvedValue([size]);
        const { wrapper } = setup();
        const off = renderHook(() => useVendorServices(false), { wrapper });
        expect(off.result.current.fetchStatus).toBe('idle');
        const on = renderHook(() => useVendorServices(true), { wrapper });
        await waitFor(() => expect(on.result.current.data).toEqual([size]));
        expect(api.get).toHaveBeenCalledWith('/api/me/vendor-profile/services');
    });

    it('refreshes the list, every print context and every print list after a create', async () => {
        api.post.mockResolvedValue(size);
        const { queryClient, wrapper } = setup();
        seed(queryClient);
        const create = renderHook(() => useCreateVendorService(), { wrapper });
        await act(() => create.result.current.mutateAsync({ kind: 'PRINT', label: '13x18', priceCents: 300 }));
        expect(api.post).toHaveBeenCalledWith('/api/me/vendor-profile/services', { kind: 'PRINT', label: '13x18', priceCents: 300 });
        expectRefreshed(queryClient);
    });

    it('replaces a size and refreshes after an update', async () => {
        api.put.mockResolvedValue(size);
        const { queryClient, wrapper } = setup();
        seed(queryClient);
        const update = renderHook(() => useUpdateVendorService(), { wrapper });
        const body = { kind: 'PRINT' as const, label: '15x21', priceCents: 400 };
        await act(() => update.result.current.mutateAsync({ id: 's1', body }));
        expect(api.put).toHaveBeenCalledWith('/api/me/vendor-profile/services/s1', body);
        expectRefreshed(queryClient);
    });

    it('deletes a size and refreshes', async () => {
        api.del.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        seed(queryClient);
        const remove = renderHook(() => useDeleteVendorService(), { wrapper });
        await act(() => remove.result.current.mutateAsync('s1'));
        expect(api.del).toHaveBeenCalledWith('/api/me/vendor-profile/services/s1');
        expectRefreshed(queryClient);
    });
});
