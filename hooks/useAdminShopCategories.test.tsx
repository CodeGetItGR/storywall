import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    useAdminShopCategories,
    useCreateShopCategory,
    useDeleteShopCategory,
    usePatchShopCategory,
    useSetShopCategoryCollections,
} from '@/hooks/useAdminShopCategories';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminShopCategoryDto } from '@/lib/api/types';

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

const categoryFixture: AdminShopCategoryDto = {
    id: 'c1',
    name: { en: 'Wedding invitations', el: 'Wedding invitations (el)' },
    slug: 'prosklitiria-gamoy',
    sortOrder: 0,
    isVisible: true,
    collections: [],
};

describe('useAdminShopCategories', () => {
    it('creates a category and refetches the list', async () => {
        api.post.mockResolvedValue(categoryFixture);
        api.get.mockResolvedValue([categoryFixture]);
        const input = { name: categoryFixture.name, slug: categoryFixture.slug };
        const { result } = renderHook(() => ({ list: useAdminShopCategories(), create: useCreateShopCategory() }), { wrapper });

        await waitFor(() => expect(result.current.list.data).toHaveLength(1));
        await act(() => result.current.create.mutateAsync(input));

        expect(api.post).toHaveBeenCalledWith('/api/admin/shop/categories', input);
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('patches, replaces collections and deletes through the category routes', async () => {
        api.get.mockResolvedValue([]);
        api.patch.mockResolvedValue(categoryFixture);
        api.put.mockResolvedValue(categoryFixture);
        api.del.mockResolvedValue(undefined);
        const mappings = { collections: [{ storeId: 's1', collectionGid: 'gid://shopify/Collection/1', collectionTitle: 'Wedding' }] };
        const { result } = renderHook(
            () => ({ patch: usePatchShopCategory(), set: useSetShopCategoryCollections(), del: useDeleteShopCategory() }),
            { wrapper },
        );

        await act(() => result.current.patch.mutateAsync({ id: 'c1', input: { isVisible: false } }));
        await act(() => result.current.set.mutateAsync({ id: 'c1', input: mappings }));
        await act(() => result.current.del.mutateAsync('c1'));

        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.shop.category('c1'), { isVisible: false });
        expect(api.put).toHaveBeenCalledWith(endpoints.admin.shop.categoryCollections('c1'), mappings);
        expect(api.del).toHaveBeenCalledWith(endpoints.admin.shop.category('c1'));
    });
});
