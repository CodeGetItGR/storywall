import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import { ApiError } from '@/lib/api/client';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';

const get = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => get(...args) },
}));

const event = { id: 'e-1', theme: null } as unknown as EventDetailResponseDto;

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => get.mockReset());

describe('useFeedLayout', () => {
    it('asks nothing and draws the default layout while the flag is off', () => {
        const { result } = renderHook(() => useFeedLayout(event, { enabled: false }), { wrapper });
        expect(get).not.toHaveBeenCalled();
        expect(result.current.document).toEqual(defaultFeedLayout());
    });

    it('ignores a cached layout while the flag is off', () => {
        const client = new QueryClient();
        client.setQueryData(['events', 'e-1', 'feed-layout'], { themeSlug: null, revision: 9, document: defaultFeedLayout(), design: null, imageUrls: {}, updatedAt: '' });
        const cached = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        const { result } = renderHook(() => useFeedLayout(event, { enabled: false }), { wrapper: cached });
        expect(result.current.revision).toBe(0);
    });

    it('reads the saved layout', async () => {
        const base = defaultFeedLayout();
        get.mockResolvedValue({ themeSlug: null, revision: 2, document: { ...base, sections: [...base.sections, SAMPLE_SECTIONS.faq] }, design: null, imageUrls: {}, updatedAt: '' });
        const { result } = renderHook(() => useFeedLayout(event, { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.revision).toBe(2));
        expect(get).toHaveBeenCalledWith('/api/events/e-1/feed-layout');
        expect(result.current.document.sections.map((section) => section.type)).toContain('faq');
    });

    it('treats a 404 as nothing saved', async () => {
        get.mockRejectedValue(new ApiError(404, null));
        const { result } = renderHook(() => useFeedLayout(event, { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.document).toEqual(defaultFeedLayout());
    });

    it('draws the default layout when the call fails', async () => {
        get.mockRejectedValue(new ApiError(500, null));
        const { result } = renderHook(() => useFeedLayout(event, { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.document).toEqual(defaultFeedLayout());
    });
});
