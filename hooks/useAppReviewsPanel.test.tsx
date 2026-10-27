import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppReviewsPanel } from '@/hooks/useAppReviewsPanel';
import type { AdminAppReviewDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));
vi.mock('@/hooks/useAppConfig', () => ({ invalidatePublicConfig: vi.fn() }));

function review(overrides: Partial<AdminAppReviewDto> = {}): AdminAppReviewDto {
    return {
        id: 'r1',
        stars: 5,
        comment: 'Great',
        role: 'HOST',
        eventType: 'WEDDING',
        eventId: 'e1',
        userId: 'u1',
        firstName: 'Maria',
        locale: 'en',
        publicConsent: true,
        status: 'PENDING',
        featured: false,
        createdAt: '2026-10-01T10:00:00Z',
        ...overrides,
    };
}

function pageOf(content: AdminAppReviewDto[]) {
    return { content, page: { size: 50, number: 0, totalElements: content.length, totalPages: 1 } };
}

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    api.get.mockReset().mockResolvedValue(pageOf([review()]));
    api.patch.mockReset();
});

describe('useAppReviewsPanel', () => {
    it('keeps the drawer review after it leaves the filtered list', async () => {
        const { result } = renderHook(() => useAppReviewsPanel(), { wrapper });
        act(() => result.current.setStatus('PENDING'));
        await waitFor(() => expect(result.current.reviewsQuery.data?.content).toHaveLength(1));
        act(() => result.current.openReview('r1'));
        expect(result.current.selected?.id).toBe('r1');

        const approved = review({ status: 'APPROVED' });
        api.patch.mockResolvedValue(approved);
        api.get.mockResolvedValue(pageOf([]));
        act(() => result.current.patchSelected({ status: 'APPROVED' }));

        await waitFor(() => expect(result.current.reviewsQuery.data?.content).toHaveLength(0));
        expect(result.current.selected).toEqual(approved);
    });

    it('clears the patch error when another review is opened or the drawer closes', async () => {
        api.get.mockResolvedValue(pageOf([review(), review({ id: 'r2' })]));
        const { result } = renderHook(() => useAppReviewsPanel(), { wrapper });
        await waitFor(() => expect(result.current.reviewsQuery.data?.content).toHaveLength(2));
        act(() => result.current.openReview('r1'));

        api.patch.mockRejectedValue(new Error('nope'));
        act(() => result.current.patchSelected({ featured: true }));
        await waitFor(() => expect(result.current.patchError).not.toBeNull());
        act(() => result.current.openReview('r2'));
        await waitFor(() => expect(result.current.patchError).toBeNull());

        act(() => result.current.patchSelected({ featured: true }));
        await waitFor(() => expect(result.current.patchError).not.toBeNull());
        act(() => result.current.closeReview());
        await waitFor(() => expect(result.current.patchError).toBeNull());
        expect(result.current.selected).toBeNull();
    });
});
