import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));

import { useVendorReach, vendorReachKeys } from '@/hooks/useVendorReach';

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

describe('useVendorReach', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the reach of the caller', async () => {
        api.get.mockResolvedValue({ guests: 3, listTaps: 1, partner: false });
        const { wrapper } = setup();
        const { result } = renderHook(() => useVendorReach('e1', true), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual({ guests: 3, listTaps: 1, partner: false }));
        expect(api.get).toHaveBeenCalledWith('/api/events/e1/vendors/me/reach');
    });

    it('waits until the caller is known to be a vendor', () => {
        const { wrapper } = setup();
        renderHook(() => useVendorReach('e1', false), { wrapper });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('uses warm data under the exported key', () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(vendorReachKeys.me('e1'), { guests: 9, listTaps: 0, partner: false });
        const { result } = renderHook(() => useVendorReach('e1', true), { wrapper });
        expect(result.current.data?.guests).toBe(9);
    });
});
