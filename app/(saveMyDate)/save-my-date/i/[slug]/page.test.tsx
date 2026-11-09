import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';

// next/font only works inside a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
function stubResizeObserver() {
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        disconnect() {}
    });
}

// The real page, loader and copy; only the network, the request and the locale are stubbed. The
// provider stands in for the server render, where the sections read their labels the same way.
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }) }));
vi.mock('next-intl/server', () => ({
    getLocale: async () => 'en',
    getTranslations: async (namespace: keyof typeof en) => (key: string) => (en[namespace] as Record<string, string>)[key],
}));
const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
);
vi.mock('next/navigation', () => ({ notFound }));

import Page, { generateMetadata } from './page';

const fetchMock = vi.fn();
const invitation = { slug: 'maria-and-nikos', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, imageUrls: {} };

// The public invitation answers `invitationStatus`; the font catalogue answers an empty list.
function backend(invitationStatus: number) {
    fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/api/invitation-fonts/files')) return new Response('[]', { status: 200 });
        if (url.includes('/api/public/invitations/')) {
            return new Response(invitationStatus === 200 ? JSON.stringify(invitation) : null, { status: invitationStatus });
        }
        throw new Error(`Unexpected fetch ${url}`);
    });
}

function visit(slug = 'maria-and-nikos') {
    return { params: Promise.resolve({ slug }) };
}

async function renderPage(slug?: string) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            {await Page(visit(slug))}
        </NextIntlClientProvider>,
    );
}

beforeEach(() => {
    stubResizeObserver();
    fetchMock.mockReset();
    notFound.mockClear();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('Published invitation page', () => {
    it('renders a live invitation on the server, with its fonts', async () => {
        backend(200);
        await renderPage();
        expect(document.querySelector('.smd-invitation')).not.toBeNull();
        expect(screen.queryByRole('heading', { name: en.PublishedInvitation.notFound })).toBeNull();
        const urls = fetchMock.mock.calls.map(([url]) => url as string);
        expect(urls.some((url) => url.endsWith('/api/public/invitations/maria-and-nikos'))).toBe(true);
        expect(urls.some((url) => url.endsWith('/api/invitation-fonts/files'))).toBe(true);
    });

    it('shows the not-found page for an unknown or unpublished link, without loading fonts', async () => {
        backend(404);
        await renderPage();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.PublishedInvitation.notFound);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('shows the expired page once the event is no longer covered', async () => {
        backend(410);
        await renderPage();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.PublishedInvitation.expired);
    });

    it('offers a retry when the backend fails', async () => {
        backend(503);
        await renderPage();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.InvitationEditor.loadFailed);
        expect(screen.getByRole('button', { name: en.PageErrorState.retry })).toBeInTheDocument();
    });

    it('never indexes or follows, and titles the tab after what it shows', async () => {
        backend(200);
        expect(await generateMetadata(visit())).toEqual({ title: en.PublishedInvitation.metaTitle, robots: { index: false, follow: false } });
        backend(410);
        expect(await generateMetadata(visit('expired-one'))).toEqual({
            title: en.PublishedInvitation.expired,
            robots: { index: false, follow: false },
        });
    });

    it('is not there on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        backend(200);
        await expect(Page(visit())).rejects.toThrow('NEXT_NOT_FOUND');
        expect(await generateMetadata(visit())).toEqual({ robots: { index: false, follow: false } });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
