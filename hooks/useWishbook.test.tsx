import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditWishbookEntry, useMyWishes, useWishbook, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
const apiPut = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a), put: (...a: unknown[]) => apiPut(...a), post: vi.fn(), del: vi.fn() },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const emptyPage = { content: [], page: { number: 0, totalPages: 1, totalElements: 0, size: 20 } };

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useWishbook hooks', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPut.mockReset();
    });

    it('asks for nothing without an event, so a guest never requests the hosts list', () => {
        renderHook(() => useWishbook(null), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('reads the caller’s own wishes', async () => {
        apiGet.mockResolvedValue(emptyPage);
        const { result } = renderHook(() => useMyWishes('e1'), { wrapper: wrapperFor(client) });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiGet).toHaveBeenCalledWith(`${endpoints.events.wishbookMine('e1')}?page=0&size=20`);
    });

    it('keeps the own list under the wishbook key, so writes refresh it', () => {
        expect(wishbookKeys.mine('e1').slice(0, 3)).toEqual(wishbookKeys.list('e1'));
    });

    it('saves an edit and refreshes the own list', async () => {
        apiPut.mockResolvedValue({ id: 'w1', message: 'New' });
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ entryId: 'w1', message: 'New' }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.byId('w1'), { message: 'New' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: wishbookKeys.mine('e1') });
    });
});
