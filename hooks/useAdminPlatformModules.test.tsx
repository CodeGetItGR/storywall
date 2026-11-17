import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));

import { useAdminPlatformModules } from '@/hooks/useAdmin';
import { useEventTypeModuleMatrix } from '@/hooks/useEventTypeModuleMatrix';

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

const ROWS = [{ moduleKey: 'rsvp' }, { moduleKey: 'save_my_date' }];

beforeEach(() => {
    api.get.mockReset().mockResolvedValue(ROWS);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('admin module lists', () => {
    it('list Save my date where it shows', async () => {
        vi.stubEnv('VERCEL_ENV', 'preview');
        const { result } = renderHook(() => useAdminPlatformModules(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual(ROWS));
    });

    it('leave Save my date out of the platform modules on the production site', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
        vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
        const { result } = renderHook(() => useAdminPlatformModules(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual([{ moduleKey: 'rsvp' }]));
    });

    it('leave Save my date out of an event type matrix on the production site', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
        vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
        const { result } = renderHook(() => useEventTypeModuleMatrix('WEDDING'), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual([{ moduleKey: 'rsvp' }]));
        expect(api.get).toHaveBeenCalledWith('/api/admin/event-types/WEDDING/modules');
    });
});
