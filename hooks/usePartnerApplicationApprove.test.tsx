import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));
vi.mock('@/lib/overlayHistory', () => ({ pushPageEntry: (...args: unknown[]) => mocks.push(...args) }));

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.push.mockReset();
    mocks.get.mockResolvedValue({ foundingSpotsTotal: 20, foundingSpotsLeft: 3 });
});

describe('usePartnerApplicationApprove', () => {
    it('ticks founding once the count shows a spot, and opens the new partner on success', async () => {
        mocks.post.mockResolvedValue({ collaboratorId: 'c-1' });
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await waitFor(() => expect(result.current.founding).toBe(true));
        expect(result.current.foundingDisabled).toBe(false);

        await act(async () => {
            await result.current.confirm();
        });

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/approve', { founding: true });
        expect(mocks.push).toHaveBeenCalledWith('#collaborations/c-1');
    });

    it('unticks and disables founding when the spots ran out', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5190 }));
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await waitFor(() => expect(result.current.founding).toBe(true));
        mocks.get.mockResolvedValue({ foundingSpotsTotal: 20, foundingSpotsLeft: 0 });

        await act(async () => {
            await result.current.confirm();
        });

        await waitFor(() => expect(result.current.foundingDisabled).toBe(true));
        expect(result.current.founding).toBe(false);
        expect(result.current.error).toEqual({ kind: 'foundingFull' });
        expect(result.current.errorMessageKey).toBe('foundingSpotsFull');
        expect(result.current.isOpen).toBe(true);
    });

    it('keeps the existing partner id when the email is taken', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5191, details: { collaboratorId: 'c-9' } }));
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await act(async () => {
            await result.current.confirm();
        });

        await waitFor(() => expect(result.current.error).toEqual({ kind: 'emailExists', collaboratorId: 'c-9' }));
        expect(result.current.errorMessageKey).toBe('collaboratorEmailExists');
        expect(result.current.existingPartnerHash).toBe('#collaborations/c-9');
        expect(mocks.push).not.toHaveBeenCalled();
    });
});
