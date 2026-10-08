import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    adminLandingCategoryKeys,
    useAdminLandingCategories,
    useCreateLandingCategory,
    useDeleteLandingCategory,
    useLandingCategoryMove,
    usePatchLandingCategory,
    useSetLandingCategoryEventTypes,
} from '@/hooks/useAdminLandingCategories';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminLandingCategoryDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const invalidatePublicConfig = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useAppConfig', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/hooks/useAppConfig')>()),
    invalidatePublicConfig,
}));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

let client: QueryClient;

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    for (const fn of Object.values(api)) {
        fn.mockReset();
        fn.mockResolvedValue({ id: 'c1' });
    }
    invalidatePublicConfig.mockReset();
});

function category(id: string, sortOrder: number): AdminLandingCategoryDto {
    return { id, name: { en: id }, description: {}, sortOrder, isVisible: true, isDefault: false, eventTypeKeys: [] };
}

describe('useAdminLandingCategories', () => {
    it('lists the categories', async () => {
        api.get.mockResolvedValue([]);
        const { result } = renderHook(() => useAdminLandingCategories(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.landingCategories.list);
    });

    it('creates, patches, sets types and deletes through the admin routes', async () => {
        const wrapper = wrapperFor(client);
        const create = renderHook(() => useCreateLandingCategory(), { wrapper }).result;
        const patch = renderHook(() => usePatchLandingCategory(), { wrapper }).result;
        const setTypes = renderHook(() => useSetLandingCategoryEventTypes(), { wrapper }).result;
        const remove = renderHook(() => useDeleteLandingCategory(), { wrapper }).result;

        await act(() => create.current.mutateAsync({ name: { en: 'A', el: 'Α' } }));
        await act(() => patch.current.mutateAsync({ id: 'c1', input: { isVisible: false } }));
        await act(() => setTypes.current.mutateAsync({ id: 'c1', input: { eventTypeKeys: ['REUNION'], moveFromOtherCategory: true } }));
        await act(() => remove.current.mutateAsync('c1'));

        expect(api.post).toHaveBeenCalledWith(endpoints.admin.landingCategories.list, { name: { en: 'A', el: 'Α' } });
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.landingCategories.byId('c1'), { isVisible: false });
        expect(api.put).toHaveBeenCalledWith(endpoints.admin.landingCategories.eventTypes('c1'), {
            eventTypeKeys: ['REUNION'],
            moveFromOtherCategory: true,
        });
        expect(api.del).toHaveBeenCalledWith(endpoints.admin.landingCategories.byId('c1'));
    });

    it('refreshes the list, the event types and the public config after a write', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useDeleteLandingCategory(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('c1'));

        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminLandingCategoryKeys.all });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'platform-event-types'] });
        expect(invalidatePublicConfig).toHaveBeenCalledWith(client);
    });

    it('moves a category by patching sortOrder', async () => {
        const items = [category('a', 0), category('b', 1)];
        const { result } = renderHook(() => useLandingCategoryMove(items), { wrapper: wrapperFor(client) });

        act(() => result.current.move('b', 'up'));

        await waitFor(() => expect(api.patch).toHaveBeenCalled());
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.landingCategories.byId('b'), { sortOrder: 0 });
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.landingCategories.byId('a'), { sortOrder: 1 });
    });
});
