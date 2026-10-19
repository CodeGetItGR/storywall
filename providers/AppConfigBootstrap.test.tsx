import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appConfigKeys, useAppConfig } from '@/hooks/useAppConfig';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
const publicGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { publicGet: (...args: unknown[]) => publicGet(...args) } }));
vi.mock('@/lib/api/publicConfigActions', () => ({ revalidatePublicConfig: vi.fn() }));

const CONFIG = { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] } as unknown as AppConfigResponseDto;

function EventTypeCount() {
    const { data } = useAppConfig();
    return <span>{data ? `${data.eventTypes.length} types` : 'no config'}</span>;
}

describe('AppConfigBootstrap', () => {
    afterEach(() => {
        publicGet.mockReset();
        pathname.current = '/';
    });

    it('leaves a page-prefetched config readable in the server render', () => {
        const server = new QueryClient();
        server.setQueryData(appConfigKeys.all, CONFIG);

        const html = renderToString(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
                <HydrationBoundary state={dehydrate(server)}>
                    <EventTypeCount />
                </HydrationBoundary>
            </QueryClientProvider>,
        );

        expect(html).toContain('1 types');
    });

    it('loads the config once mounted', async () => {
        publicGet.mockResolvedValue(CONFIG);
        const client = new QueryClient();

        render(
            <QueryClientProvider client={client}>
                <AppConfigBootstrap />
            </QueryClientProvider>,
        );

        await waitFor(() => expect(client.getQueryData(appConfigKeys.all)).toEqual(CONFIG));
    });

    it('leaves the config alone on the demo', () => {
        pathname.current = '/demo/wedding/feed';

        render(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
            </QueryClientProvider>,
        );

        expect(publicGet).not.toHaveBeenCalled();
    });
});
