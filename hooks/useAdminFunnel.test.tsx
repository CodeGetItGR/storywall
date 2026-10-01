import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminKeys, useAdminFunnel, useAdminFunnelCohorts } from '@/hooks/useAdmin';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({});
});

describe('funnel query keys', () => {
    it('nest under the metrics key so a metrics refresh covers them', () => {
        expect(adminKeys.funnel(null, null).slice(0, 2)).toEqual(adminKeys.metrics);
        expect(adminKeys.funnelCohorts(12).slice(0, 2)).toEqual(adminKeys.metrics);
        expect(adminKeys.funnel('a', 'b')).not.toEqual(adminKeys.funnel('a', null));
    });

    it('are refreshed by invalidating the metrics key', async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const { result } = renderHook(() => [useAdminFunnel(null, null), useAdminFunnelCohorts(26)] as const, { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current[0].isSuccess && result.current[1].isSuccess).toBe(true));

        apiGet.mockClear();
        await client.invalidateQueries({ queryKey: adminKeys.metrics });

        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/funnel');
        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/funnel/cohorts?weeks=26');
    });
});

describe('useAdminFunnel', () => {
    it('does not call the backend for an invalid range', () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        renderHook(() => useAdminFunnel('2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z', { enabled: false }), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
