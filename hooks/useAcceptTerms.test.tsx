import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAcceptTerms } from '@/hooks/useAcceptTerms';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const apiPost = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: (...a: unknown[]) => apiPost(...a) },
}));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useAcceptTerms', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiPost.mockReset();
    });

    it('sends the version with the 18+ confirmation and refetches /api/me', async () => {
        apiPost.mockResolvedValue(undefined);
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAcceptTerms(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('2026-10-04'));

        expect(apiPost).toHaveBeenCalledWith(endpoints.me.termsAcceptance, { version: '2026-10-04', adultConfirmed: true });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });

    // A 3043 means a newer version went live: /api/me brings it.
    it('refetches /api/me on failure too', async () => {
        apiPost.mockRejectedValue(new ApiError(400, { errorCode: 3043 }));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAcceptTerms(), { wrapper: wrapperFor(client) });

        await act(async () => {
            await result.current.mutateAsync('2026-09-01').catch(() => undefined);
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });
});
