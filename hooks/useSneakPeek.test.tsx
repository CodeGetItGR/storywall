import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { vendorKeys } from '@/hooks/useVendors';
import { ApiError } from '@/lib/api/client';
import type { PostResponseDto, VendorMeDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

import { useCreateSneakPeek, useDeleteSneakPeek, useUpdateSneakPeek } from '@/hooks/useSneakPeek';

const ME = { vendorId: 'v1', sneakPeek: { postId: null, mediaIds: [], content: null, used: false } } as unknown as VendorMeDto;
const POST = { id: 'p1', eventId: 'e1', type: 'SNEAK_PEEK', content: 'Hi', media: [{ id: 'm2' }, { id: 'm1' }] } as unknown as PostResponseDto;

const OTHER = { id: 'p2', eventId: 'e1', type: 'TEXT', content: 'Other', media: [] } as unknown as PostResponseDto;

function feedContent(queryClient: QueryClient) {
    return queryClient
        .getQueryData<{ pages: { content: PostResponseDto[] }[] }>(postKeys.list('e1'))
        ?.pages.flatMap((page) => page.content.map((post) => post.content));
}

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(vendorKeys.me('e1'), ME);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, invalidate, wrapper };
}

describe('useSneakPeek', () => {
    beforeEach(() => vi.clearAllMocks());

    it('posts the sneak peek and marks it used', async () => {
        api.post.mockResolvedValue(POST);
        const { queryClient, invalidate, wrapper } = setup();
        const { result } = renderHook(() => useCreateSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync({ mediaIds: ['m2', 'm1'], content: 'Hi' }));

        expect(api.post).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek', { mediaIds: ['m2', 'm1'], content: 'Hi' });
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek).toEqual({
            postId: 'p1',
            mediaIds: ['m2', 'm1'],
            content: 'Hi',
            used: true,
        });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.list('e1') });
    });

    it('patches only what it is given', async () => {
        api.patch.mockResolvedValue({ ...POST, content: null });
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useUpdateSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync({ content: '' }));

        expect(api.patch).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek', { content: '' });
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek?.content).toBeNull();
    });

    it('deletes it and keeps it used', async () => {
        api.del.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useDeleteSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync());

        expect(api.del).toHaveBeenCalledWith('/api/events/e1/vendors/me/sneak-peek');
        expect(queryClient.getQueryData<VendorMeDto>(vendorKeys.me('e1'))?.sneakPeek).toEqual({
            postId: null,
            mediaIds: [],
            content: null,
            used: true,
        });
    });

    it('patches the edited post in the feed and reloads its media', async () => {
        api.patch.mockResolvedValue({ ...POST, content: 'New' });
        const { queryClient, invalidate, wrapper } = setup();
        queryClient.setQueryData(postKeys.list('e1'), { pages: [{ content: [POST, OTHER] }], pageParams: [0] });
        const { result } = renderHook(() => useUpdateSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync({ content: 'New' }));

        expect(feedContent(queryClient)).toEqual(['New', 'Other']);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.media('p1') });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: postKeys.list('e1') });
    });

    it('drops the deleted post from the feed without refetching it', async () => {
        api.del.mockResolvedValue(undefined);
        const { queryClient, invalidate, wrapper } = setup();
        queryClient.setQueryData(vendorKeys.me('e1'), { ...ME, sneakPeek: { postId: 'p1', mediaIds: ['m1'], content: 'Hi', used: true } });
        queryClient.setQueryData(postKeys.list('e1'), { pages: [{ content: [POST, OTHER] }], pageParams: [0] });
        const { result } = renderHook(() => useDeleteSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync());

        expect(feedContent(queryClient)).toEqual(['Other']);
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('reloads the vendor page when the sneak peek is already gone', async () => {
        api.del.mockRejectedValue(new ApiError(404, null));
        const { invalidate, wrapper } = setup();
        const { result } = renderHook(() => useDeleteSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync().catch(() => undefined));

        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.me('e1') });
    });

    it('leaves the vendor page alone on other errors', async () => {
        api.del.mockRejectedValue(new ApiError(500, null));
        const { invalidate, wrapper } = setup();
        const { result } = renderHook(() => useDeleteSneakPeek('e1'), { wrapper });

        await act(() => result.current.mutateAsync().catch(() => undefined));

        expect(invalidate).not.toHaveBeenCalled();
    });
});
