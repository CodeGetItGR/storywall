import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventMedia } from '@/hooks/useMedia';
import { useEventStories } from '@/hooks/useStories';

// The gallery and stories lists have no ETag and no poll of their own. Their
// presigned URLs expire, so each list refetches once per signing window.

const REFRESH_MS = 20 * 60_000;

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/useAppConfig', () => ({ usePresignedUrlRefreshMs: () => REFRESH_MS }));

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { get: (...a: unknown[]) => apiGet(...a) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('presigned URL refresh', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        apiGet.mockReset();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('refetches the gallery once per signing window', async () => {
        apiGet.mockResolvedValue({ content: [], page: { number: 0, size: 30, totalElements: 0, totalPages: 0 } });
        renderHook(() => useEventMedia('event-1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

        await vi.advanceTimersByTimeAsync(REFRESH_MS);

        expect(apiGet).toHaveBeenCalledTimes(2);
    });

    it('refetches the stories once per signing window', async () => {
        apiGet.mockResolvedValue([]);
        renderHook(() => useEventStories('event-1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

        await vi.advanceTimersByTimeAsync(REFRESH_MS);

        expect(apiGet).toHaveBeenCalledTimes(2);
    });
});
