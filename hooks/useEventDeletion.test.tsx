import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCancelEventDeletion, useRequestEventDeletion, useRequestEventDeletionOtp } from '@/hooks/useEventDeletion';

const apiDelete = vi.fn();
const apiPost = vi.fn();

vi.mock('@/lib/api/client', () => ({
    api: {
        del: (...args: unknown[]) => apiDelete(...args),
        post: (...args: unknown[]) => apiPost(...args),
    },
}));

function createWrapper() {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('event deletion mutations', () => {
    beforeEach(() => {
        apiDelete.mockReset();
        apiPost.mockReset();
    });

    it('requests an OTP without a request body', async () => {
        apiPost.mockResolvedValue(undefined);
        const { result } = renderHook(() => useRequestEventDeletionOtp('event-1'), { wrapper: createWrapper() });

        await act(() => result.current.mutateAsync());

        expect(apiPost).toHaveBeenCalledWith('/api/events/event-1/deletion-requests/otp');
    });

    it('confirms deletion with the OTP code', async () => {
        apiPost.mockResolvedValue({ id: 'event-1' });
        const { result } = renderHook(() => useRequestEventDeletion('event-1'), { wrapper: createWrapper() });

        await act(() => result.current.mutateAsync({ otpCode: '042817' }));

        expect(apiPost).toHaveBeenCalledWith('/api/events/event-1/deletion-requests', { otpCode: '042817' });
    });

    it('cancels a pending deletion through the shared resource', async () => {
        apiDelete.mockResolvedValue({ id: 'event-1' });
        const { result } = renderHook(() => useCancelEventDeletion('event-1'), { wrapper: createWrapper() });

        await act(() => result.current.mutateAsync());

        expect(apiDelete).toHaveBeenCalledWith('/api/events/event-1/deletion-requests');
    });
});
