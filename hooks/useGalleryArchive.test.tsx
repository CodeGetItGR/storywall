import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGallerySummary } from '@/hooks/useGalleryArchive';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a) },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const EVENT_ID = 'event-1';

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({ photoCount: 12, videoCount: 3 });
});

describe('useGallerySummary', () => {
    it('reads the counts from the summary endpoint, not the archive manifest', async () => {
        const { result } = renderHook(() => useGallerySummary(EVENT_ID), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual({ photoCount: 12, videoCount: 3 }));
        expect(apiGet).toHaveBeenCalledTimes(1);
        expect(apiGet).toHaveBeenCalledWith(endpoints.events.mediaSummary(EVENT_ID));
    });

    it('requests nothing while disabled', async () => {
        renderHook(() => useGallerySummary(EVENT_ID, false), { wrapper });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(apiGet).not.toHaveBeenCalled();
    });
});
