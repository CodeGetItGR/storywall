import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePostModalPost } from '@/hooks/usePostModalPost';
import { ApiError } from '@/lib/api/client';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a) },
}));

const POST = { id: 'post-1' };

function renderPostModalPost() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => usePostModalPost(POST.id), { wrapper });
}

describe('usePostModalPost', () => {
    beforeEach(() => apiGet.mockReset());

    it('is loading until the post arrives', async () => {
        apiGet.mockResolvedValue(POST);
        const { result } = renderPostModalPost();

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.post).toEqual(POST));
        expect(result.current).toMatchObject({ isLoading: false, isNotFound: false, isLoadFailed: false });
    });

    it('reports a 404 as not found', async () => {
        apiGet.mockRejectedValueOnce(new ApiError(404, null));
        const { result } = renderPostModalPost();

        await waitFor(() => expect(result.current.isNotFound).toBe(true));
        expect(result.current.isLoadFailed).toBe(false);
    });

    // A failure other than 404 used to leave the modal blank.
    it('reports any other failure as load failed, and retries', async () => {
        apiGet.mockRejectedValueOnce(new ApiError(401, null));
        const { result } = renderPostModalPost();

        await waitFor(() => expect(result.current.isLoadFailed).toBe(true));
        expect(result.current.isNotFound).toBe(false);

        apiGet.mockResolvedValue(POST);
        act(() => result.current.retry());

        await waitFor(() => expect(result.current.post).toEqual(POST));
        expect(result.current.isLoadFailed).toBe(false);
    });
});
