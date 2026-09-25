import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rsvpKeys, useRsvpReport } from '@/hooks/useRsvps';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { get: (...a: unknown[]) => apiGet(...a) },
    ApiError: class ApiError extends Error {},
}));

function wrapperFor(client: QueryClient, locale: string) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <NextIntlClientProvider locale={locale} messages={{}}>
                <QueryClientProvider client={client}>{children}</QueryClientProvider>
            </NextIntlClientProvider>
        );
    };
}

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => apiGet.mockReset());

describe('useRsvpReport', () => {
    it('fetches the requested report type', async () => {
        apiGet.mockResolvedValue({ reportType: 'FULL_LIST' });

        const { result } = renderHook(() => useRsvpReport('event-1', 'FULL_LIST'), { wrapper: wrapperFor(newClient(), 'en') });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiGet).toHaveBeenCalledWith('/api/events/event-1/rsvps/report?reportType=FULL_LIST');
    });

    it('does nothing without an event', () => {
        renderHook(() => useRsvpReport(null, 'STATISTICS'), { wrapper: wrapperFor(newClient(), 'en') });

        expect(apiGet).not.toHaveBeenCalled();
    });

    // Labels arrive translated, so a report cached in one language must not be shown in another.
    it('keys the cache by language', async () => {
        apiGet.mockResolvedValue({ reportType: 'STATISTICS' });
        const client = newClient();

        const { result } = renderHook(() => useRsvpReport('event-1', 'STATISTICS'), { wrapper: wrapperFor(client, 'el') });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(client.getQueryData(rsvpKeys.report('event-1', 'STATISTICS', 'el'))).toBeDefined();
        expect(client.getQueryData(rsvpKeys.report('event-1', 'STATISTICS', 'en'))).toBeUndefined();
    });

    // Any RSVP change invalidates rsvpKeys.list, which prefixes the report keys.
    it('is refreshed whenever the RSVP list is', async () => {
        apiGet.mockResolvedValue({ reportType: 'STATISTICS' });
        const client = newClient();
        const { result } = renderHook(() => useRsvpReport('event-1', 'STATISTICS'), { wrapper: wrapperFor(client, 'en') });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        await client.invalidateQueries({ queryKey: rsvpKeys.list('event-1') });

        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    });
});
