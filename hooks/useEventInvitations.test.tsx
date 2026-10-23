import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAcceptEventInvitation } from '@/hooks/useEventInvitations';
import { vendorKeys } from '@/hooks/useVendors';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { post } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useAppConfig', () => ({ usePresignedUrlRefreshMs: () => 1000 }));

describe('useAcceptEventInvitation', () => {
    it("refreshes the event's vendor role and list, and no other event's", async () => {
        post.mockResolvedValue({ id: 'm1', eventId: 'e1' });
        const queryClient = new QueryClient();
        for (const eventId of ['e1', 'e2']) {
            queryClient.setQueryData(vendorKeys.me(eventId), null);
            queryClient.setQueryData(vendorKeys.list(eventId), []);
        }
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
        const { result } = renderHook(() => useAcceptEventInvitation(), { wrapper });

        await result.current.mutateAsync('token');

        expect(queryClient.getQueryState(vendorKeys.me('e1'))?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(vendorKeys.list('e1'))?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(vendorKeys.me('e2'))?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(vendorKeys.list('e2'))?.isInvalidated).toBe(false);
    });
});
