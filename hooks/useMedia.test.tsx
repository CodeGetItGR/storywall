import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mediaKeys, useEventMedia } from '@/hooks/useMedia';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const readable = vi.hoisted(() => ({ keys: new Set(['gallery', 'vendors']) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: (_: string, key: string) => readable.keys.has(key) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }), usePresignedUrlRefreshMs: () => 20 * 60_000 }));

const PAGE = { content: [], page: { number: 0, totalPages: 1, totalElements: 0, size: 30 } };

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue(PAGE);
    readable.keys = new Set(['gallery', 'vendors']);
});

describe('mediaKeys', () => {
    it('keeps the Pro list under the gallery key so every gallery refresh reaches it', () => {
        expect(mediaKeys.proList('e1').slice(0, 3)).toEqual(mediaKeys.list('e1'));
    });
});

describe('useEventMedia', () => {
    it('keeps the guest URL as it was', async () => {
        renderHook(() => useEventMedia('e1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30'));
    });

    it('asks for the Pro collection', async () => {
        renderHook(() => useEventMedia('e1', 'PRO'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/events/e1/media?page=0&size=30&collection=PRO'));
    });

    it('checks again soon while a video it just got is processing, and stops once it is ready', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const processing = {
                id: 'v1',
                mediaType: 'VIDEO',
                status: 'PROCESSING',
                createdAt: new Date().toISOString(),
            };
            apiGet
                .mockResolvedValueOnce({ ...PAGE, content: [processing] })
                .mockResolvedValueOnce({ ...PAGE, content: [{ ...processing, status: 'READY' }] });

            const { result } = renderHook(() => useEventMedia('e1'), { wrapper });
            await waitFor(() => expect(result.current.data?.pages[0].content[0].status).toBe('PROCESSING'));

            await vi.advanceTimersByTimeAsync(5_000);
            await waitFor(() => expect(result.current.data?.pages[0].content[0].status).toBe('READY'));
            expect(apiGet).toHaveBeenCalledTimes(2);

            // Ready: back to the signing-window refresh, so nothing more in the next minute.
            await vi.advanceTimersByTimeAsync(60_000);
            expect(apiGet).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('never asks for Pro without the vendors module', () => {
        readable.keys = new Set(['gallery']);
        renderHook(() => useEventMedia('e1', 'PRO'), { wrapper });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
