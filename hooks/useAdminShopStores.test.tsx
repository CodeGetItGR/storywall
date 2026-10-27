import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    useAdminShopStores,
    useCreateShopStore,
    useDeleteShopStore,
    usePatchShopStore,
    useShopStoreCollections,
    useSyncShopStore,
} from '@/hooks/useAdminShopStores';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminShopStoreCreateDto, AdminShopStoreDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    for (const fn of Object.values(api)) {
        fn.mockReset();
    }
});

const storeFixture: AdminShopStoreDto = {
    id: 's1',
    name: 'Inviart',
    slug: 'inviart',
    shopDomain: 'inviart.myshopify.com',
    clientId: 'cid',
    isVisible: true,
    lastSyncedAt: null,
    lastSyncError: null,
    productCount: 0,
};

const createInput: AdminShopStoreCreateDto = {
    name: 'Inviart',
    slug: 'inviart',
    shopDomain: 'inviart.myshopify.com',
    clientId: 'cid',
    clientSecret: 'secret',
    isVisible: true,
};

describe('useAdminShopStores', () => {
    it('creates a store and refetches the list', async () => {
        api.post.mockResolvedValue(storeFixture);
        api.get.mockResolvedValue([storeFixture]);
        const { result } = renderHook(() => ({ list: useAdminShopStores(), create: useCreateShopStore() }), { wrapper });

        await waitFor(() => expect(result.current.list.data).toHaveLength(1));
        await act(() => result.current.create.mutateAsync(createInput));

        expect(api.post).toHaveBeenCalledWith('/api/admin/shop/stores', createInput);
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('loads collections only for an opened store', () => {
        api.get.mockResolvedValue([]);
        renderHook(() => useShopStoreCollections(null), { wrapper });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('loads collections for a store id', async () => {
        api.get.mockResolvedValue([]);
        const { result } = renderHook(() => useShopStoreCollections('s1'), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.shop.storeCollections('s1'));
    });

    it('patches, syncs and deletes through the store routes', async () => {
        api.get.mockResolvedValue([]);
        api.patch.mockResolvedValue(storeFixture);
        api.post.mockResolvedValue(undefined);
        api.del.mockResolvedValue(undefined);
        const { result } = renderHook(() => ({ patch: usePatchShopStore(), sync: useSyncShopStore(), del: useDeleteShopStore() }), { wrapper });

        await act(() => result.current.patch.mutateAsync({ id: 's1', input: { isVisible: false } }));
        await act(() => result.current.sync.mutateAsync('s1'));
        await act(() => result.current.del.mutateAsync('s1'));

        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.shop.store('s1'), { isVisible: false });
        expect(api.post).toHaveBeenCalledWith(endpoints.admin.shop.storeSync('s1'));
        expect(api.del).toHaveBeenCalledWith(endpoints.admin.shop.store('s1'));
    });
});
