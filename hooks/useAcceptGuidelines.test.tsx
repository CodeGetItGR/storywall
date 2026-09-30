import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAcceptGuidelines } from '@/hooks/useAcceptGuidelines';
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

describe('useAcceptGuidelines', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiPost.mockReset();
    });

    // Success closes the gate once /api/me says nothing is required.
    it('sends the version and refetches /api/me on success', async () => {
        apiPost.mockResolvedValue(undefined);
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAcceptGuidelines(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('2026-09-30'));

        expect(apiPost).toHaveBeenCalledWith(endpoints.me.guidelinesAcceptance, { version: '2026-09-30' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });

    // A 3037 means a newer version went live: /api/me brings it.
    it('refetches /api/me on failure too', async () => {
        apiPost.mockRejectedValue(new ApiError(400, { errorCode: 3037 }));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAcceptGuidelines(), { wrapper: wrapperFor(client) });

        await act(async () => {
            await result.current.mutateAsync('2026-09-01').catch(() => undefined);
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });
});
