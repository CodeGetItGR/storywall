import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    campaignKeys,
    useCampaignDetailQuery,
    useCampaignListQuery,
    useCreateCampaign,
    useDeleteCampaign,
    useMoveCampaignLink,
} from '@/hooks/useAdminCampaignApi';
import type { CampaignRequestDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
        patch: (...args: unknown[]) => mocks.patch(...args),
        del: (...args: unknown[]) => mocks.del(...args),
    },
}));
vi.mock('@/hooks/useAppConfig', () => ({ invalidatePublicConfig: vi.fn() }));

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

const REQUEST: CampaignRequestDto = { name: 'Autumn', linkName: 'autumn', startsAt: null, endsAt: null, discount: null, links: null };

describe('campaign writes', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.patch.mockReset();
        mocks.del.mockReset();
    });
    afterEach(cleanup);

    it('refreshes every campaign query and the live discount after a write', async () => {
        mocks.post.mockResolvedValue({ id: 'c-1' });
        const { client, wrapper } = setup();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useCreateCampaign(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync(REQUEST);
        });

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/campaigns', REQUEST);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'campaigns'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discount-campaign', 'live'] });
    });

    it('moves a link to another campaign', async () => {
        mocks.patch.mockResolvedValue({});
        const { wrapper } = setup();
        const { result } = renderHook(() => useMoveCampaignLink(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ id: 'l-1', campaignId: 'c-2' });
        });

        expect(mocks.patch).toHaveBeenCalledWith('/api/admin/campaign-links/l-1', { campaignId: 'c-2' });
    });

    it("forgets a deleted campaign's page instead of asking for it again", async () => {
        mocks.del.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        client.setQueryData(campaignKeys.detail('c-1', null, null), { campaign: { id: 'c-1' } });
        const { result } = renderHook(() => useDeleteCampaign(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync('c-1');
        });

        expect(mocks.del).toHaveBeenCalledWith('/api/admin/campaigns/c-1');
        expect(client.getQueryData(campaignKeys.detail('c-1', null, null))).toBeUndefined();
    });
});
