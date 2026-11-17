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
const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (path: string) => apiGet(path) },
}));

import GreekPage, { generateMetadata as greekMetadata } from '@/app/(landing)/[slug]/prosklitiria/[themeSlug]/page';
import { SITE_URL } from '@/lib/seo';

import Page, { generateMetadata } from './page';

const fetchMock = vi.fn();
const OLIVE = {
    slug: 'olive',
    name: 'Olive',
    eventType: 'WEDDING',
    seoTitle: 'Olive: Τίτλος',
    seoDescription: null,
    ogImageUrl: null,
    cardColor: '#d8c7b4',
    productPhotos: [{ url: 'https://cdn.example.com/olive-1.jpg', alt: 'Πρώτη' }],
    design: {},
    document: {},
};

// The theme endpoint answers with `status`.
function backend(status: number) {
    fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith('/api/invitation-themes/olive')) return new Response(status === 200 ? JSON.stringify(OLIVE) : null, { status });
        throw new Error(`Unexpected fetch ${url}`);
    });
}

// The route returns the async server component; run it the way the server render would.
async function serverRender(route: Promise<ReactNode>): Promise<ReactNode> {
    const element = (await route) as ReactElement<Record<string, unknown>, (props: Record<string, unknown>) => Promise<ReactNode>>;
    return element.type(element.props);
}

async function renderPage(page: ReactNode, locale: 'el' | 'en' = 'en') {
    render(
        <NextIntlClientProvider locale={locale} messages={locale === 'el' ? el : en}>
            {page}
        </NextIntlClientProvider>,
    );
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
    vi.unstubAllGlobals();
});

describe('theme page', () => {
    it('renders the theme from the server without fetching it again in the browser', async () => {
        backend(200);
        await renderPage(await serverRender(Page({ params: Promise.resolve({ themeSlug: 'olive' }) })));
        expect(screen.getByRole('heading', { level: 1, name: 'Olive' })).toBeInTheDocument();
        expect(screen.getByAltText('Olive invitation design, photo 1')).toBeInTheDocument();
        expect(apiGet).not.toHaveBeenCalled();
        expect(frame.structuredData).toMatchObject({ '@graph': [{ '@type': 'Product', name: 'Olive', url: `${SITE_URL}/invitations/olive` }, {}] });
    });

    it('404s for a theme that does not exist', async () => {
        backend(404);
        await expect(serverRender(Page({ params: Promise.resolve({ themeSlug: 'olive' }) }))).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await generateMetadata({ params: Promise.resolve({ themeSlug: 'olive' }) })).toEqual({});
    });

    it('404s for a slug no theme could have, without asking the backend', async () => {
        await expect(serverRender(Page({ params: Promise.resolve({ themeSlug: '../admin' }) }))).rejects.toThrow('NEXT_NOT_FOUND');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still renders when the backend fails, and loads the theme in the browser', async () => {
        backend(500);
        apiGet.mockResolvedValue(OLIVE);
        await renderPage(await serverRender(Page({ params: Promise.resolve({ themeSlug: 'olive' }) })));
        expect(await screen.findByRole('heading', { level: 1, name: 'Olive' })).toBeInTheDocument();
        expect(frame.structuredData).toBeNull();
    });

    it('404s on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        backend(200);
        await expect(serverRender(Page({ params: Promise.resolve({ themeSlug: 'olive' }) }))).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await generateMetadata({ params: Promise.resolve({ themeSlug: 'olive' }) })).toEqual({});
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('gives the English page the template title and its own canonical', async () => {
        backend(200);
        const metadata = await generateMetadata({ params: Promise.resolve({ themeSlug: 'olive' }) });
        expect(metadata.title).toBe('Olive: online wedding invitation | StoryWall');
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/invitations/olive`);
    });
});

describe('Greek theme page', () => {
    it("uses the admin's title and the admin's photo alt text", async () => {
        backend(200);
        const metadata = await greekMetadata({ params: Promise.resolve({ slug: 'el', themeSlug: 'olive' }) });
        expect(metadata.title).toBe('Olive: Τίτλος');
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/el/prosklitiria/olive`);

        await renderPage(await serverRender(GreekPage({ params: Promise.resolve({ slug: 'el', themeSlug: 'olive' }) })), 'el');
        expect(screen.getByAltText('Πρώτη')).toBeInTheDocument();
    });

    it('exists only under /el', async () => {
        backend(200);
        await expect(serverRender(GreekPage({ params: Promise.resolve({ slug: 'weddings', themeSlug: 'olive' }) }))).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await greekMetadata({ params: Promise.resolve({ slug: 'weddings', themeSlug: 'olive' }) })).toEqual({});
    });
});
