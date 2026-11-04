import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminCampaignKeys, useAdminCampaigns } from '@/hooks/useAdminCampaigns';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => mocks.get(...args) },
}));

// A report that is cached and counts as fresh, as the app's long default staleTime leaves it.
function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(adminCampaignKeys.report(null, null), []);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { wrapper };
}

describe('useAdminCampaigns', () => {
    beforeEach(() => {
        mocks.get.mockReset();
        mocks.get.mockResolvedValue([]);
    });
    afterEach(cleanup);

    it('refetches a fresh cached report on mount when asked to always', async () => {
        const { wrapper } = setup();
        renderHook(() => useAdminCampaigns(null, null, { refetchOnMount: 'always' }), { wrapper });

        await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    });

    it('keeps using a fresh cached report on mount by default', async () => {
        const { wrapper } = setup();
        const { result } = renderHook(() => useAdminCampaigns(null, null), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual([]));
        expect(mocks.get).not.toHaveBeenCalled();
    });
});
