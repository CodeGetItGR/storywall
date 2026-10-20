import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReviewPromptSheet } from '@/hooks/useReviewPromptSheet';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES } from '@/lib/api/errors';
import type { AppReviewPromptDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    api: { get: vi.fn(), post: vi.fn() },
    pathname: { value: '/home' },
    user: { value: { id: 'u1', role: 'USER' } as { id: string; role: string } | null },
    overlay: { value: false },
}));

vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: mocks.api,
}));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname.value }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user.value }) }));
vi.mock('@/hooks/useOverlayPresence', () => ({ useHasOpenOverlay: () => mocks.overlay.value }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

const prompt: AppReviewPromptDto = { eventId: 'e1', eventTitle: 'Our wedding', eventType: 'WEDDING', role: 'HOST' };

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function dismissCalls() {
    return mocks.api.post.mock.calls.filter(([path]) => path === endpoints.me.reviewsDismiss);
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    mocks.pathname.value = '/home';
    mocks.user.value = { id: 'u1', role: 'USER' };
    mocks.overlay.value = false;
    mocks.api.get.mockReset().mockResolvedValue(prompt);
    mocks.api.post.mockReset().mockResolvedValue(null);
});

describe('useReviewPromptSheet', () => {
    it('opens for a signed-in non-admin on home with no overlay', async () => {
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
    });

    it('stays closed for an admin', async () => {
        mocks.user.value = { id: 'a1', role: 'ADMIN' };
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await act(async () => {});
        expect(mocks.api.get).not.toHaveBeenCalled();
        expect(result.current.open).toBe(false);
    });

    it('stays closed on other pages', async () => {
        mocks.pathname.value = '/profile';
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await act(async () => {});
        expect(mocks.api.get).not.toHaveBeenCalled();
        expect(result.current.open).toBe(false);
    });

    it('stays closed while another overlay is open', async () => {
        mocks.overlay.value = true;
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.prompt).toEqual(prompt));
        expect(result.current.open).toBe(false);
    });

    it('does not reopen after closing and sends one dismissal', async () => {
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
        act(() => result.current.close());
        await waitFor(() => expect(dismissCalls()).toHaveLength(1));
        expect(dismissCalls()[0][1]).toEqual({ eventId: 'e1' });
        expect(result.current.open).toBe(false);
        expect(result.current.prompt).toBeNull();
        expect(dismissCalls()).toHaveLength(1);
    });

    it('sends no dismissal when closed after a successful send', async () => {
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
        act(() => result.current.send({ stars: 5, comment: null, publicConsent: false }));
        await waitFor(() => expect(result.current.sent).toBe(true));
        act(() => result.current.close());
        expect(result.current.open).toBe(false);
        expect(dismissCalls()).toHaveLength(0);
    });

    it('hides without a dismissal when closed (Back) while the rating is being sent', async () => {
        mocks.api.post.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
        act(() => result.current.send({ stars: 5, comment: null, publicConsent: false }));
        await waitFor(() => expect(result.current.isSending).toBe(true));
        act(() => result.current.close());
        expect(result.current.open).toBe(false);
        expect(result.current.prompt).toBeNull();
        expect(dismissCalls()).toHaveLength(0);
    });

    it('closes quietly when the review was already answered elsewhere', async () => {
        mocks.api.post.mockRejectedValue(new ApiError(400, { errorCode: ERROR_CODES.APP_REVIEW_NOT_ELIGIBLE, title: 'x', status: 400 }));
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
        act(() => result.current.send({ stars: 5, comment: null, publicConsent: false }));
        await waitFor(() => expect(result.current.open).toBe(false));
        expect(result.current.prompt).toBeNull();
        expect(result.current.error).toBeNull();
        expect(dismissCalls()).toHaveLength(0);
    });

    it('keeps the sheet open and shows other send errors', async () => {
        mocks.api.post.mockRejectedValue(new ApiError(500, null));
        const { result } = renderHook(() => useReviewPromptSheet(), { wrapper });
        await waitFor(() => expect(result.current.open).toBe(true));
        act(() => result.current.send({ stars: 5, comment: null, publicConsent: false }));
        await waitFor(() => expect(result.current.error).toBe('error'));
        expect(result.current.open).toBe(true);
    });
});
