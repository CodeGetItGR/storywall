import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnreadNotificationCount } from '@/hooks/useNotifications';

const mocks = vi.hoisted(() => ({ pathname: '/home' }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
// Signed in, as the demo's own session is too.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

describe('useUnreadNotificationCount', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn(async () => Response.json({ unreadCount: 3 }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        mocks.pathname = '/home';
    });

    function renderCount() {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
        return renderHook(() => useUnreadNotificationCount(), { wrapper });
    }

    it('reads the badge count', async () => {
        const { result } = renderCount();

        await waitFor(() => expect(result.current.data).toBe(3));
        expect(String(fetchMock.mock.calls[0][0])).toContain('/api/notifications/unread-count');
    });

    // The demo has no inbox, and its mock worker would refuse the call.
    it('asks for nothing on a demo page', async () => {
        mocks.pathname = '/demo/wedding/feed';
        const { result } = renderCount();
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.data).toBeUndefined();
    });
});
