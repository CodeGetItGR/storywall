import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMemberArchive } from '@/hooks/useMemberArchive';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    readable: true,
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => mocks.readable }));
vi.mock('@/lib/api/client', () => ({ api: { get: mocks.get } }));

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMemberArchive', () => {
    afterEach(() => {
        cleanup();
        mocks.get.mockReset();
        mocks.readable = true;
    });

    it('reads the member archive endpoint', async () => {
        mocks.get.mockResolvedValue({ status: 'PREPARING', availableFrom: null, parts: [] });

        const { result } = renderHook(() => useMemberArchive('event-1', true), { wrapper });

        await waitFor(() => expect(result.current.data?.status).toBe('PREPARING'));
        expect(mocks.get).toHaveBeenCalledWith('/api/events/event-1/media/member-archive');
    });

    it('does not ask while closed or when the gallery is unreadable', () => {
        renderHook(() => useMemberArchive('event-1', false), { wrapper });
        mocks.readable = false;
        renderHook(() => useMemberArchive('event-1', true), { wrapper });

        expect(mocks.get).not.toHaveBeenCalled();
    });
});
