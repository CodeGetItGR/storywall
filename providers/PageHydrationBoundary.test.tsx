import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appConfigKeys, useAppConfig } from '@/hooks/useAppConfig';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';
import { AppProviders } from '@/providers/AppProviders';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

vi.mock('next/navigation', () => ({
    usePathname: () => '/profile',
    useParams: () => ({}),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
const publicGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, publicGet: (...args: unknown[]) => publicGet(...args) } };
});
vi.mock('@/lib/api/publicConfigActions', () => ({ revalidatePublicConfig: vi.fn() }));

const CONFIG = { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] } as unknown as AppConfigResponseDto;

function prefetchedConfig() {
    const server = new QueryClient();
    server.setQueryData(appConfigKeys.all, CONFIG);
    return dehydrate(server);
}

// Stands in for the providers above every page that read the config (EventProvider, BetaFeedback…).
function ConfigReader() {
    useAppConfig();
    return null;
}

function EventTypeCount({ renders }: { renders?: string[] }) {
    const { data } = useAppConfig();
    const text = data ? `${data.eventTypes.length} types` : 'no config';
    renders?.push(text);
    return <span>{text}</span>;
}

describe('PageHydrationBoundary', () => {
    afterEach(() => {
        cleanup();
        publicGet.mockReset();
    });

    it('leaves a page-prefetched config readable in the server render under AppProviders', () => {
        const html = renderToString(
            <NextIntlClientProvider locale="en" messages={{}}>
                <AppProviders>
                    <PageHydrationBoundary state={prefetchedConfig()}>
                        <EventTypeCount />
                    </PageHydrationBoundary>
                </AppProviders>
            </NextIntlClientProvider>,
        );

        expect(html).toContain('1 types');
    });

    it('shows the config in the first client render without asking for it again', async () => {
        const renders: string[] = [];

        render(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
                <ConfigReader />
                <PageHydrationBoundary state={prefetchedConfig()}>
                    <EventTypeCount renders={renders} />
                </PageHydrationBoundary>
            </QueryClientProvider>,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(renders[0]).toBe('1 types');
        expect(publicGet).not.toHaveBeenCalled();
    });

    // HydrationBoundary's rule for data already on screen still holds: it changes after render.
    it('leaves data the cache already holds for HydrationBoundary', async () => {
        const key = ['greeting'];
        const server = new QueryClient();
        server.setQueryData(key, 'new', { updatedAt: Date.now() + 1000 });
        const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
        client.setQueryData(key, 'old');
        const renders: string[] = [];
        function Greeting() {
            const { data } = useQuery({ queryKey: key, queryFn: () => 'fetched' });
            renders.push(String(data));
            return <span>{data}</span>;
        }

        render(
            <QueryClientProvider client={client}>
                <PageHydrationBoundary state={dehydrate(server)}>
                    <Greeting />
                </PageHydrationBoundary>
            </QueryClientProvider>,
        );

        expect(renders[0]).toBe('old');
        expect(await screen.findByText('new')).toBeInTheDocument();
    });

    // The case it replaces: the config lands only after the first render, and the client fetches it again.
    it('differs from a plain HydrationBoundary, which fills the config late', async () => {
        publicGet.mockResolvedValue(CONFIG);
        const renders: string[] = [];

        render(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
                <ConfigReader />
                <HydrationBoundary state={prefetchedConfig()}>
                    <EventTypeCount renders={renders} />
                </HydrationBoundary>
            </QueryClientProvider>,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(renders[0]).toBe('no config');
        expect(publicGet).toHaveBeenCalledTimes(1);
    });
});
