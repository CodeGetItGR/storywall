import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import el from '@/messages/el.json';
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
    // A namespace, or the RSVP action's { locale, namespace } in the invitation's language.
    getTranslations: async (scope: keyof typeof en | { locale: 'el' | 'en'; namespace: keyof typeof en }) => {
        const [messages, namespace] = typeof scope === 'string' ? [en, scope] : [scope.locale === 'el' ? el : en, scope.namespace];
        return (key: string, values: Record<string, unknown> = {}) =>
            (messages[namespace] as Record<string, string>)[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
    },
}));
const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
);
vi.mock('next/navigation', () => ({ notFound }));

import Page, { generateMetadata } from './page';

const fetchMock = vi.fn();
const SAMPLE_INVITATION = { slug: 'maria-and-nikos', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, imageUrls: {}, updatedAt: '2026-11-10T09:00:00Z' };
let invitation: typeof SAMPLE_INVITATION = SAMPLE_INVITATION;

// The sample with text in its top section, the way the real themes write the couple's names.
function withTopText(...texts: string[]): typeof SAMPLE_INVITATION {
    const elements = texts.map((text, index) => ({ id: `e-top-${index}`, kind: 'text' as const, role: 'title' as const, text, style: {} }));
    const sections = SAMPLE_DOCUMENT.sections.map((section) => (section.type === 'top' ? { ...section, elements } : section));
    return { ...SAMPLE_INVITATION, document: { ...SAMPLE_DOCUMENT, sections } };
}

// The public invitation answers `invitationStatus`, its RSVP route `rsvp`; the font catalogue answers an empty list.
function backend(invitationStatus: number, rsvp: () => Response = () => new Response(null, { status: 204 })) {
    fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/api/invitation-fonts/files')) return new Response('[]', { status: 200 });
        if (url.endsWith('/rsvp')) return rsvp();
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
    // Sections with effects watch for coming on screen.
    stubIntersectionObserver();
    fetchMock.mockReset();
    notFound.mockClear();
    invitation = SAMPLE_INVITATION;
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

    it('never indexes or follows, and titles a missing or expired link after its message', async () => {
        backend(404);
        expect(await generateMetadata(visit('gone'))).toEqual({ title: en.PublishedInvitation.notFound, robots: { index: false, follow: false } });
        backend(410);
        expect(await generateMetadata(visit('expired-one'))).toEqual({
            title: en.PublishedInvitation.expired,
            robots: { index: false, follow: false },
        });
    });

    it("gives a live link its own preview: the top section's names, the date and place, and a picture that doesn't expire", async () => {
        invitation = withTopText('Άγγελος', '&', 'Αλεξάνδρα');
        backend(200);
        const image = {
            url: 'https://www.storywall.gr/save-my-date/i/maria-and-nikos/share-image?v=mwagluo0',
            width: 1200,
            height: 630,
            alt: 'Πρόσκληση: Άγγελος & Αλεξάνδρα',
            type: 'image/jpeg',
        };
        const title = 'Άγγελος & Αλεξάνδρα';
        const description = 'Κυριακή 12 Ιουλίου 2026 · 18:00 · Ιερός Ναός Αγίου Νικολάου';
        expect(await generateMetadata(visit())).toEqual({
            title,
            description,
            openGraph: { type: 'website', title, description, images: [image] },
            twitter: { card: 'summary_large_image', title, description, images: [image] },
            robots: { index: false, follow: false },
        });
    });

    it("falls back to the plain title in the invitation's language, and drops the description with no date or place", async () => {
        invitation = {
            ...invitation,
            document: {
                ...SAMPLE_DOCUMENT,
                sections: SAMPLE_DOCUMENT.sections.filter((section) => section.type !== 'date' && section.type !== 'locations'),
            },
        };
        backend(200);
        const metadata = await generateMetadata(visit());
        expect(metadata.title).toBe(el.PublishedInvitation.metaTitle);
        expect(metadata.description).toBeNull();
        expect(metadata.openGraph).toMatchObject({ title: el.PublishedInvitation.metaTitle, description: undefined });
        expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ alt: el.PublishedInvitation.metaTitle })]);
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

describe("A guest's RSVP on the published page", () => {
    // The sample invitation is in Greek, so its form and answers are too.
    const labels = INVITATION_LABELS.el;

    function rsvpForm() {
        return within(document.querySelector<HTMLElement>(`[data-section-id="${SAMPLE_SECTIONS.rsvp.id}"]`) as HTMLElement);
    }

    function reply() {
        const form = rsvpForm();
        fireEvent.change(form.getByLabelText(labels.rsvpName), { target: { value: 'Μαρία' } });
        fireEvent.change(form.getByLabelText(labels.rsvpPhone), { target: { value: '694 123 4567' } });
        fireEvent.click(form.getByRole('button', { name: labels.rsvpSubmit }));
        return form;
    }

    const rsvpCalls = () => fetchMock.mock.calls.filter(([url]) => (url as string).endsWith('/rsvp')) as [string, RequestInit][];

    it("goes to the invitation's event and thanks the guest", async () => {
        backend(200);
        await renderPage();
        const form = reply();

        await form.findByText(labels.rsvpThanks);
        const [[url, init]] = rsvpCalls();
        expect(url).toMatch(/\/api\/public\/invitations\/maria-and-nikos\/rsvp$/);
        expect(init.headers).toMatchObject({ 'Accept-Language': 'el' });
        expect(JSON.parse(init.body as string)).toEqual({
            guestName: 'Μαρία',
            attendanceStatus: 'ATTENDING',
            phone: '694 123 4567',
            email: '',
            adultCount: 2,
            childCount: 1,
            notes: '',
            website: '',
        });
    });

    it('tells the guest to wait when replies are rate limited, in the invitation language', async () => {
        backend(200, () => new Response(null, { status: 429, headers: { 'Retry-After': '1800' } }));
        await renderPage();
        const form = reply();

        expect(await form.findByText(el.ApiErrors.rateLimitedWithWaitMinutes.replace('{minutes}', '30'))).toBeInTheDocument();
        expect(form.getByRole('button', { name: labels.rsvpSubmit })).toBeInTheDocument();
    });
});
