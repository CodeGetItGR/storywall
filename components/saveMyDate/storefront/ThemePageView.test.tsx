import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invitationThemeKeys,type InvitationThemePage } from '@/lib/invitation/themeCatalogue';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { get: (path: string) => apiGet(path) } }));

import { ThemePageView } from './ThemePageView';

const OLIVE: InvitationThemePage = {
    slug: 'olive',
    name: 'Olive',
    eventType: 'WEDDING',
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    cardColor: '#d8c7b4',
    photos: [
        { url: 'https://cdn.example.com/olive-1.jpg', alt: 'Πρώτη φωτογραφία' },
        { url: 'https://cdn.example.com/olive-2.jpg', alt: null },
        { url: 'https://cdn.example.com/olive-3.jpg', alt: null },
    ],
};

// A theme already in the cache stands in for the server's prefetch.
function renderPage({ locale = 'en', theme = OLIVE as InvitationThemePage | null } = {}) {
    // Fresh for a while, like the app's own client, so a prefetched theme isn't fetched again.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
    if (theme) queryClient.setQueryData(invitationThemeKeys.page('olive'), theme);
    render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale={locale} messages={locale === 'el' ? el : en}>
                <ThemePageView slug="olive" />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

// The photo on show: every photo is in the page, the others hidden.
function shownPhoto() {
    return screen.getAllByRole('img').find((image) => !image.classList.contains('hidden'));
}

beforeEach(() => {
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('ThemePageView', () => {
    it('shows the theme name, event type, back link and both buttons', () => {
        renderPage();
        expect(screen.getByRole('heading', { level: 1, name: 'Olive' })).toBeInTheDocument();
        expect(screen.getByText('Wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'All designs' })).toHaveAttribute('href', '/invitations');
        expect(screen.getByRole('link', { name: 'Live demo' })).toHaveAttribute('href', '/save-my-date/preview?theme=olive');
        expect(screen.getByRole('link', { name: 'Try it free' }).getAttribute('href')).toContain('theme=olive');
        expect(apiGet).not.toHaveBeenCalled();
    });

    it("lists what's included, open by default", () => {
        renderPage();
        const included = screen.getByText("What's included").closest('details') as HTMLDetailsElement;
        expect(included.open).toBe(true);
        expect(within(included).getAllByRole('listitem')).toHaveLength(en.SaveMyDateStorefront.theme.includedItems.length);
        expect((screen.getByText('How it works').closest('details') as HTMLDetailsElement).open).toBe(false);
    });

    it('steps through the photos with the arrows and dots', () => {
        renderPage();
        expect(shownPhoto()).toHaveAttribute('alt', 'Olive invitation design, photo 1');

        fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
        expect(shownPhoto()).toHaveAttribute('alt', 'Olive invitation design, photo 2');
        expect(screen.getByRole('button', { name: 'Photo 2' })).toHaveAttribute('aria-current', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Photo 3' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
        expect(shownPhoto()).toHaveAttribute('alt', 'Olive invitation design, photo 1');

        fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
        expect(shownPhoto()).toHaveAttribute('alt', 'Olive invitation design, photo 3');
    });

    it('moves to the next photo on a swipe left', () => {
        renderPage();
        const frame = shownPhoto()?.parentElement as HTMLElement;
        fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 10 }] });
        fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 100, clientY: 12 }] });
        expect(shownPhoto()).toHaveAttribute('alt', 'Olive invitation design, photo 2');
    });

    it("uses the admin's alt text on the Greek page", () => {
        renderPage({ locale: 'el' });
        expect(shownPhoto()).toHaveAttribute('alt', 'Πρώτη φωτογραφία');
        expect(screen.getByRole('link', { name: el.SaveMyDateStorefront.theme.back })).toHaveAttribute('href', '/el/prosklitiria');
    });

    it("stands the theme's colour in for missing photos, with alt text", () => {
        renderPage({ theme: { ...OLIVE, photos: [] } });
        expect(screen.getByRole('img', { name: 'Olive invitation design' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    });

    it('shares the page in each app and copies its link', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        renderPage();

        const whatsapp = screen.getByRole('link', { name: 'Share on WhatsApp' });
        expect(whatsapp.getAttribute('href')).toContain(encodeURIComponent('/invitations/olive'));
        expect(screen.getByRole('link', { name: 'Share on Messenger' }).getAttribute('href')).toMatch(/^fb-messenger:/);
        expect(screen.getByRole('link', { name: 'Share on Viber' }).getAttribute('href')).toMatch(/^viber:/);
        expect(screen.getByRole('link', { name: 'Send by email' }).getAttribute('href')).toMatch(/^mailto:/);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
        });
        expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/invitations\/olive$/));
        expect(await screen.findByText('Link copied')).toBeInTheDocument();
    });

    it('shows a loading state, then the theme from the browser', async () => {
        let resolve: (value: unknown) => void = () => undefined;
        apiGet.mockReturnValue(new Promise((done) => (resolve = done)));
        renderPage({ theme: null });
        expect(screen.getByRole('status', { name: 'Loading design' })).toBeInTheDocument();

        await act(async () => {
            resolve({ slug: 'olive', name: 'Olive', eventType: 'WEDDING', productPhotos: [] });
        });
        expect(await screen.findByRole('heading', { level: 1, name: 'Olive' })).toBeInTheDocument();
        expect(apiGet).toHaveBeenCalledWith('/api/invitation-themes/olive');
    });

    it('offers a retry when the theme fails to load', async () => {
        apiGet.mockRejectedValue(new Error('down'));
        renderPage({ theme: null });
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent("The design didn't load.");

        apiGet.mockResolvedValue({ slug: 'olive', name: 'Olive', eventType: 'WEDDING', productPhotos: [] });
        fireEvent.click(within(alert).getByRole('button', { name: en.PageErrorState.retry }));
        await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Olive' })).toBeInTheDocument());
    });
});
