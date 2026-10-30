import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminKeys } from '@/hooks/useAdmin';
import {
    partnerApplicationKeys,
    partnerProgramKeys,
    useApprovePartnerApplication,
    useDeclinePartnerApplication,
    usePendingApplicationsCount,
} from '@/hooks/useAdminPartnerApplications';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));

function makeClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function isInvalidated(client: QueryClient, key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated ?? false;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
});

describe('usePendingApplicationsCount', () => {
    it('reads totalElements of a one-row pending page', async () => {
        mocks.get.mockResolvedValue({ content: [], page: { size: 1, number: 0, totalElements: 4, totalPages: 4 } });
        const { result } = renderHook(() => usePendingApplicationsCount(), { wrapper: wrapperFor(makeClient()) });

        await waitFor(() => expect(result.current).toBe(4));
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/partner-applications?page=0&size=1&status=PENDING');
    });
});

describe('useApprovePartnerApplication', () => {
    it('invalidates the applications, the partners and the public summary', async () => {
        const client = makeClient();
        client.setQueryData(partnerApplicationKeys.list('PENDING', 0), {});
        client.setQueryData(partnerApplicationKeys.pendingCount, 1);
        client.setQueryData(adminKeys.collaborators, []);
        client.setQueryData(partnerProgramKeys.summary, { foundingSpotsTotal: 20, foundingSpotsLeft: 3 });
        mocks.post.mockResolvedValue({ collaboratorId: 'c-1' });

        const { result } = renderHook(() => useApprovePartnerApplication(), { wrapper: wrapperFor(client) });
        let response: unknown;
        await act(async () => {
            response = await result.current.mutateAsync({ id: 'a-1', founding: true });
        });

        expect(response).toEqual({ collaboratorId: 'c-1' });
        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/approve', { founding: true });
        expect(isInvalidated(client, partnerApplicationKeys.list('PENDING', 0))).toBe(true);
        expect(isInvalidated(client, partnerApplicationKeys.pendingCount)).toBe(true);
        expect(isInvalidated(client, adminKeys.collaborators)).toBe(true);
        expect(isInvalidated(client, partnerProgramKeys.summary)).toBe(true);
    });
});

describe('useDeclinePartnerApplication', () => {
    it('writes the decided application into its detail query', async () => {
        const client = makeClient();
        const declined = { id: 'a-1', status: 'DECLINED', declineReason: 'No' };
        mocks.post.mockResolvedValue(declined);

        const { result } = renderHook(() => useDeclinePartnerApplication(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync({ id: 'a-1', reason: 'No' });
        });

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/decline', { reason: 'No' });
        expect(client.getQueryData(partnerApplicationKeys.detail('a-1'))).toEqual(declined);
    });
});
