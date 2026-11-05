import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminCampaignKeys } from '@/hooks/useAdminCampaigns';
import {
    adminDiscountCampaignKeys,
    useCreateDiscountCampaign,
    useDeleteDiscountCampaign,
    useStopDiscountCampaign,
    useUpdateDiscountCampaign,
} from '@/hooks/useAdminDiscountCampaigns';
import { discountCampaignKeys } from '@/lib/discountCampaign';

const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        post: (...args: unknown[]) => mocks.post(...args),
        put: (...args: unknown[]) => mocks.put(...args),
        del: (...args: unknown[]) => mocks.del(...args),
    },
}));

function setup() {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(adminDiscountCampaignKeys.all, []);
    client.setQueryData(discountCampaignKeys.live(), null);
    client.setQueryData(adminCampaignKeys.report(null, null), []);
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

function isInvalidated(client: QueryClient, key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated ?? false;
}

describe('admin discount campaign mutations', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.put.mockReset();
        mocks.del.mockReset();
    });
    afterEach(cleanup);

    it("refetches the Campaigns report after a create, as the server makes the campaign's links", async () => {
        mocks.post.mockResolvedValueOnce({ id: 'c1' });
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useCreateDiscountCampaign(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({} as never);
        });

        expect(isInvalidated(client, adminCampaignKeys.report(null, null))).toBe(true);
    });

    it('leaves the Campaigns report alone after an update, a stop and a delete', async () => {
        mocks.put.mockResolvedValue({ id: 'c1' });
        mocks.post.mockResolvedValue({ id: 'c1' });
        mocks.del.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        const { result } = renderHook(
            () => ({ update: useUpdateDiscountCampaign(), stop: useStopDiscountCampaign(), remove: useDeleteDiscountCampaign() }),
            { wrapper },
        );

        await act(async () => {
            await result.current.update.mutateAsync({ id: 'c1', input: {} as never });
            await result.current.stop.mutateAsync('c1');
            await result.current.remove.mutateAsync('c1');
        });

        expect(isInvalidated(client, adminCampaignKeys.report(null, null))).toBe(false);
    });

    it('refreshes the list and the live campaign after a failed stop, as the campaign may have changed', async () => {
        mocks.post.mockRejectedValueOnce(new Error('already ended'));
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useStopDiscountCampaign(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync('c1').catch(() => undefined);
        });

        expect(isInvalidated(client, adminDiscountCampaignKeys.all)).toBe(true);
        expect(isInvalidated(client, discountCampaignKeys.live())).toBe(true);
    });

    it('refreshes the list and the live campaign after a failed delete', async () => {
        mocks.del.mockRejectedValueOnce(new Error('already started'));
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useDeleteDiscountCampaign(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync('c1').catch(() => undefined);
        });

        expect(isInvalidated(client, adminDiscountCampaignKeys.all)).toBe(true);
        expect(isInvalidated(client, discountCampaignKeys.live())).toBe(true);
    });
});
