import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reviewKeys, useReviewPrompt } from '@/hooks/useReviewPrompt';
import { endpoints } from '@/lib/api/endpoints';
import type { AppReviewPromptDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const prompt: AppReviewPromptDto = { eventId: 'e1', eventTitle: 'Our wedding', eventType: 'WEDDING', role: 'HOST' };

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    api.get.mockReset().mockResolvedValue(prompt);
    api.post.mockReset().mockResolvedValue(null);
});

describe('useReviewPrompt', () => {
    it('does not fetch while disabled', () => {
        renderHook(() => useReviewPrompt(false), { wrapper });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('fetches the prompt', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(result.current.prompt).toEqual(prompt));
        expect(api.get).toHaveBeenCalledWith(endpoints.me.reviewPrompt);
    });

    it('treats 204 as nothing to ask', async () => {
        api.get.mockResolvedValue(null);
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        expect(result.current.prompt).toBeNull();
    });

    it('submits a rating', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await act(() => result.current.submit.mutateAsync({ eventId: 'e1', stars: 5, comment: 'Great', publicConsent: true }));
        expect(api.post).toHaveBeenCalledWith(endpoints.me.reviews, { eventId: 'e1', stars: 5, comment: 'Great', publicConsent: true });
    });

    it('dismisses and forgets the prompt', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(result.current.prompt).toEqual(prompt));
        await act(() => result.current.dismiss.mutateAsync('e1'));
        expect(api.post).toHaveBeenCalledWith(endpoints.me.reviewsDismiss, { eventId: 'e1' });
        expect(client.getQueryData(reviewKeys.prompt)).toBeNull();
    });
});
