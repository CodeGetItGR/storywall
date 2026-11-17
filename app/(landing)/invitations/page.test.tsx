import { HydrationBoundary, type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dehydrate } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type Messages, NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeQueryClient } from '@/lib/queryClient';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The real page, prefetch and copy; only the network, the locale and the landing's header and footer
// are stubbed. The frame hands the server's cache to the page the way the hydration boundary does.
vi.mock('@/i18n/serverLocale', () => ({ getServerLocale: async () => 'en' }));
vi.mock('next-intl/server', () => ({
    getTranslations: async ({ locale, namespace }: { locale: 'el' | 'en'; namespace: string }) =>
        createTranslator({ locale, messages: (locale === 'el' ? el : en) as Messages, namespace }),
}));
const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
);
vi.mock('next/navigation', () => ({ notFound, usePathname: () => '/invitations' }));
const frame = vi.hoisted(() => ({ structuredData: null as unknown }));
vi.mock('@/components/saveMyDate/storefront/StorefrontPageFrame', () => ({
    StorefrontPageFrame: ({ queryClient, structuredData, children }: { queryClient: QueryClient; structuredData: unknown; children: ReactNode }) => {
        frame.structuredData = structuredData;
        return (
            <QueryClientProvider client={makeQueryClient()}>
                <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>
            </QueryClientProvider>
        );
    },
}));
// The catalogue keeps its scroll and its column choice; jsdom has no IntersectionObserver.
vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
});
const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (path: string) => apiGet(path) },
}));

import GreekPage, { generateMetadata as greekMetadata } from '@/app/(landing)/[slug]/prosklitiria/page';
import { SITE_URL } from '@/lib/seo';

import Page, { generateMetadata } from './page';

const fetchMock = vi.fn();
const THEMES: Record<string, unknown[]> = {
    WEDDING: [{ slug: 'olive', name: 'Olive', eventType: 'WEDDING', cardColor: null, cardThumbUrl: 'https://cdn.example.com/olive.jpg' }],
    BAPTISM: [{ slug: 'anchor', name: 'Anchor', eventType: 'BAPTISM', cardColor: null, cardThumbUrl: null }],
};

// The two catalogue lists answer with `status`.
function backend(status: number) {
    fetchMock.mockImplementation(async (url: string) => {
        const eventType = new URL(url, 'http://api').searchParams.get('eventType');
        if (url.includes('/api/invitation-themes?') && eventType) {
            return new Response(status === 200 ? JSON.stringify(THEMES[eventType]) : null, { status });
        }
        throw new Error(`Unexpected fetch ${url}`);
    });
}

// The route returns the async server component; run it the way the server render would.
async function serverRender(route: Promise<ReactNode>): Promise<ReactNode> {
    const element = (await route) as ReactElement<Record<string, unknown>, (props: Record<string, unknown>) => Promise<ReactNode>>;
    return element.type(element.props);
}

function renderPage(page: ReactNode, locale: 'el' | 'en' = 'en') {
    render(
        <NextIntlClientProvider locale={locale} messages={locale === 'el' ? el : en}>
            {page}
        </NextIntlClientProvider>,
    );
}

function visit(searchParams: Record<string, string> = {}) {
    return { searchParams: Promise.resolve(searchParams) };
}

function greekVisit(slug = 'el') {
    return { params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) };
}

beforeEach(() => {
    fetchMock.mockReset();
    apiGet.mockReset();
    notFound.mockClear();
    frame.structuredData = null;
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

describe('invitation catalogue page', () => {
    it('renders the cards from the server without fetching them again in the browser', async () => {
        backend(200);
        renderPage(await serverRender(Page(visit())));
        expect(screen.getByRole('heading', { level: 1, name: 'Online invitation designs' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Olive', 'Anchor']);
        expect(apiGet).not.toHaveBeenCalled();
        expect(frame.structuredData).toMatchObject({ '@graph': [{ '@type': 'BreadcrumbList' }, { '@type': 'ItemList' }] });
    });

    it('opens with the filters in the link', async () => {
        backend(200);
        renderPage(await serverRender(Page(visit({ type: 'BAPTISM' }))));
        expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Anchor']);
    });

    it('still renders when the backend fails, and loads the cards in the browser', async () => {
        backend(500);
        apiGet.mockImplementation(async (path: string) => THEMES[path.endsWith('WEDDING') ? 'WEDDING' : 'BAPTISM']);
        renderPage(await serverRender(Page(visit())));
        expect(await screen.findByRole('heading', { level: 2, name: 'Olive' })).toBeInTheDocument();
        expect(frame.structuredData).toBeNull();
    });

    it('404s on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        await expect(Page(visit())).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await generateMetadata()).toEqual({});
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('has its own canonical and the Greek page as its pair', async () => {
        const metadata = await generateMetadata();
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/invitations`);
        expect(metadata.alternates?.languages).toMatchObject({ el: `${SITE_URL}/el/prosklitiria` });
    });
});

describe('Greek invitation catalogue page', () => {
    it('renders in Greek with its own canonical', async () => {
        backend(200);
        renderPage(await serverRender(GreekPage(greekVisit())), 'el');
        expect(screen.getByRole('heading', { level: 1, name: el.SaveMyDateStorefront.catalogue.heading })).toBeInTheDocument();
        expect((await greekMetadata(greekVisit())).alternates?.canonical).toBe(`${SITE_URL}/el/prosklitiria`);
    });

    it('exists only under /el', async () => {
        await expect(GreekPage(greekVisit('weddings'))).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await greekMetadata(greekVisit('weddings'))).toEqual({});
    });
});
