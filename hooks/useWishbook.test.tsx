import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateWishbookEntry, useEditWishbookEntry, useMyWishes, useWishbook, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiPost = vi.fn();
const apiPostForm = vi.fn();
const apiPutForm = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        put: (...a: unknown[]) => apiPut(...a),
        post: (...a: unknown[]) => apiPost(...a),
        postForm: (...a: unknown[]) => apiPostForm(...a),
        putForm: (...a: unknown[]) => apiPutForm(...a),
        del: vi.fn(),
    },
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
        apiPut.mockReset().mockResolvedValue({});
        apiPost.mockReset().mockResolvedValue({});
        apiPostForm.mockReset().mockResolvedValue({});
        apiPutForm.mockReset().mockResolvedValue({});
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

    it('saves an edit and refreshes the own list and the hosts list', async () => {
        // A host-visible wish changed (its text or recording): the list key is a prefix of "mine", so both refetch.
        apiPut.mockResolvedValue({ id: 'w1', message: 'New' });
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ entryId: 'w1', message: 'New' }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.byId('w1'), { message: 'New' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: wishbookKeys.list('e1') });
    });

    it('creates a text wish as JSON', async () => {
        const { result } = renderHook(() => useCreateWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ message: 'Hi' }));

        expect(apiPost).toHaveBeenCalledWith(endpoints.events.wishbook('e1'), { message: 'Hi' });
        expect(apiPostForm).not.toHaveBeenCalled();
    });

    it('creates a wish with a recording as multipart', async () => {
        const audio = new Blob(['x'], { type: 'audio/webm' });
        const { result } = renderHook(() => useCreateWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ guestName: 'Me', audio }));

        const [path, form] = apiPostForm.mock.calls[0] as [string, FormData];
        expect(path).toBe(endpoints.events.wishbook('e1'));
        expect(form.get('audio')).toBeInstanceOf(Blob);
        expect(JSON.parse(await (form.get('wish') as Blob).text())).toEqual({ guestName: 'Me' });
        expect(apiPost).not.toHaveBeenCalled();
    });

    it('edits with a new recording as a multipart PUT, keeping the current text', async () => {
        const audio = new Blob(['x'], { type: 'audio/mp4' });
        const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ entryId: 'w1', message: 'Hi', audio }));

        const [path, form] = apiPutForm.mock.calls[0] as [string, FormData];
        expect(path).toBe(endpoints.wishbook.byId('w1'));
        expect(JSON.parse(await (form.get('wish') as Blob).text())).toEqual({ message: 'Hi' });
        expect(form.get('audio')).toBeInstanceOf(Blob);
        expect(apiPut).not.toHaveBeenCalled();
    });

    it('removes a recording with a JSON PUT', async () => {
        const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ entryId: 'w1', message: 'Hi', removeAudio: true }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.byId('w1'), { message: 'Hi', removeAudio: true });
        expect(apiPutForm).not.toHaveBeenCalled();
    });
});
