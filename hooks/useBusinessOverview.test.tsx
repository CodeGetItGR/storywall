import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBusinessEvents } from '@/hooks/useBusinessEvents';
import { useBusinessOverview } from '@/hooks/useBusinessOverview';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { makeQueryClient } from '@/lib/queryClient';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => get(...args) },
}));

// The app's own client, so the hooks run with the real retry policy.
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const notAVendor = () => new ApiError(403, { errorCode: ERROR_CODES.NOT_A_VENDOR });

describe('business page reads', () => {
    beforeEach(() => {
        get.mockReset();
        client = makeQueryClient();
    });

    it('asks for the overview once on a 403 NOT_A_VENDOR', async () => {
        get.mockRejectedValue(notAVendor());
        const { result } = renderHook(() => useBusinessOverview(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('asks for the events once on a 403 NOT_A_VENDOR', async () => {
        get.mockRejectedValue(notAVendor());
        const { result } = renderHook(() => useBusinessEvents(), { wrapper });

        await waitFor(() => expect(result.current.loadFailed).toBe(true));
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('says the events are empty when the first page has none', async () => {
        get.mockResolvedValue({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } });
        const { result } = renderHook(() => useBusinessEvents(), { wrapper });

        await waitFor(() => expect(result.current.isEmpty).toBe(true));
        expect(result.current.loadFailed).toBe(false);
    });
});
