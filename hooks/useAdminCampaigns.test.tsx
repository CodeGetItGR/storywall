import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminCampaignKeys, useAdminCampaigns, useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => mocks.get(...args), post: (...args: unknown[]) => mocks.post(...args) },
}));

// A report that is cached and counts as fresh, as the app's long default staleTime leaves it.
function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(adminCampaignKeys.report(null, null), []);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

describe('useAdminCampaigns', () => {
    beforeEach(() => {
        mocks.get.mockReset();
        mocks.post.mockReset();
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

    it('refetches the campaigns report after a link set is generated', async () => {
        mocks.post.mockResolvedValue({ links: [], created: 8 });
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useGenerateCampaignLinkSet(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ name: 'Summer', linkName: 'summer', language: 'en' });
        });

        expect(client.getQueryState(adminCampaignKeys.report(null, null))?.isInvalidated).toBe(true);
    });
});
