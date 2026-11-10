import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignKeys, useCampaignDetailQuery, useCampaignListQuery } from '@/hooks/useAdminCampaignApi';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => mocks.get(...args) },
}));

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

describe('campaign queries', () => {
    beforeEach(() => {
        mocks.get.mockReset();
    });
    afterEach(cleanup);

    it('keys every campaign query under the old report prefix, so one invalidation reaches both', () => {
        expect(campaignKeys.list('a', 'b')).toEqual(['admin', 'campaigns', 'list', 'a', 'b']);
        expect(campaignKeys.detail('c-1', null, null)).toEqual(['admin', 'campaigns', 'detail', 'c-1', null, null]);
    });

    it('fetches the list for the range', async () => {
        mocks.get.mockResolvedValue({ items: [] });
        const { wrapper } = setup();
        const { result } = renderHook(() => useCampaignListQuery('2026-11-01T00:00:00Z', null, true), { wrapper });

        await waitFor(() => expect(result.current.data).toEqual({ items: [] }));
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/campaigns?since=2026-11-01T00%3A00%3A00Z');
    });

    it('waits while the range is invalid', () => {
        const { wrapper } = setup();
        renderHook(() => useCampaignListQuery(null, null, false), { wrapper });

        expect(mocks.get).not.toHaveBeenCalled();
    });

    it("doesn't show one campaign's numbers while another one loads", async () => {
        mocks.get.mockImplementation((path: string) => Promise.resolve({ campaign: { id: path.includes('c-1') ? 'c-1' : 'c-2' } }));
        const { wrapper } = setup();
        const { result, rerender } = renderHook(({ id }) => useCampaignDetailQuery(id, null, null, true), {
            wrapper,
            initialProps: { id: 'c-1' },
        });
        await waitFor(() => expect(result.current.data?.campaign.id).toBe('c-1'));

        mocks.get.mockImplementation(() => new Promise(() => {}));
        rerender({ id: 'c-2' });

        expect(result.current.data).toBeUndefined();
    });
});
