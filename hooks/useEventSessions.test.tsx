import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import { useEventSessions } from '@/hooks/useEventSessions';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a) },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const EVENT_ID = 'event-1';
const SESSION = { id: 'session-1', eventId: EVENT_ID, title: 'Ceremony' };

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

// The app's staleTime, which decides whether a seeded list is fresh enough to skip the fetch.
function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30 * 1000 } } });
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue([SESSION]);
});

describe('useEventSessions', () => {
    it('uses the sessions embedded in a fresh event detail, without fetching them again', async () => {
        const client = newClient();
        client.setQueryData(eventKeys.detail(EVENT_ID), { id: EVENT_ID, sessions: [SESSION] });

        const { result } = renderHook(() => useEventSessions(EVENT_ID), { wrapper: wrapperFor(client) });

        expect(result.current.data).toEqual([SESSION]);
        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('fetches when the event detail is not cached', async () => {
        const { result } = renderHook(() => useEventSessions(EVENT_ID), { wrapper: wrapperFor(newClient()) });

        await waitFor(() => expect(result.current.data).toEqual([SESSION]));
        expect(apiGet).toHaveBeenCalledWith(endpoints.events.sessions(EVENT_ID));
    });

    it("fetches when the cached detail carries no sessions (the schedule wasn't readable then)", async () => {
        const client = newClient();
        client.setQueryData(eventKeys.detail(EVENT_ID), { id: EVENT_ID, sessions: null });

        const { result } = renderHook(() => useEventSessions(EVENT_ID), { wrapper: wrapperFor(client) });

        await waitFor(() => expect(result.current.data).toEqual([SESSION]));
        expect(apiGet).toHaveBeenCalledTimes(1);
    });

    it('shows the embedded sessions but refetches them when the detail is already stale', async () => {
        const client = newClient();
        client.setQueryData(eventKeys.detail(EVENT_ID), { id: EVENT_ID, sessions: [] }, { updatedAt: Date.now() - 60 * 1000 });

        const { result } = renderHook(() => useEventSessions(EVENT_ID), { wrapper: wrapperFor(client) });

        expect(result.current.data).toEqual([]);
        await waitFor(() => expect(result.current.data).toEqual([SESSION]));
        expect(apiGet).toHaveBeenCalledTimes(1);
    });
});
