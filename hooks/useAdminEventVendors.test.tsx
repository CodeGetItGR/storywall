import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAdminEventVendors } from '@/hooks/useAdminEvents';

const apiGet = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/api/client', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('useAdminEventVendors', () => {
    it('reads the admin vendor list', async () => {
        renderHook(() => useAdminEventVendors('e1'), { wrapper });
        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/admin/events/e1/vendors'));
    });

    it('asks nothing without an event', () => {
        apiGet.mockClear();
        renderHook(() => useAdminEventVendors(null), { wrapper });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
