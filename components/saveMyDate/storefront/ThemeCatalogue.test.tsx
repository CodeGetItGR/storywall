import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { DEFAULT_CATALOGUE_FILTERS, type InvitationThemeCardDto, readCatalogueFilters } from '@/lib/invitation/themeCatalogue';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { get: (path: string) => apiGet(path) } }));

import { ThemeCatalogue } from './ThemeCatalogue';

function card(slug: string, name: string, eventType = 'WEDDING'): InvitationThemeCardDto {
    return { slug, name, eventType, cardColor: '#d8c7b4', cardThumbUrl: `https://cdn.example.com/${slug}.jpg` };
}

const WEDDINGS = [card('olive', 'Olive'), card('kyknos', 'Κύκνος'), card('blush', 'Blush')];
const BAPTISMS = [card('anchor', 'Anchor', 'BAPTISM')];

// The backend's two lists, by the event type the request asks for.
function backend(weddings: InvitationThemeCardDto[] = WEDDINGS, baptisms: InvitationThemeCardDto[] = BAPTISMS) {
    apiGet.mockImplementation(async (path: string) => (path.endsWith('WEDDING') ? weddings : baptisms));
}

function renderCatalogue({ locale = 'en', path = '/invitations', filters = DEFAULT_CATALOGUE_FILTERS } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale={locale} messages={locale === 'el' ? el : en}>
                <ThemeCatalogue initialFilters={filters} path={path} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

function cardNames() {
    return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
}

beforeEach(() => {
    stubIntersectionObserver();
    apiGet.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/invitations');
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('ThemeCatalogue', () => {
    it('shows every theme with its alt text, page link and editor link', async () => {
        backend();
        renderCatalogue();
        expect(await screen.findByRole('heading', { level: 2, name: 'Olive' })).toBeInTheDocument();
        expect(cardNames()).toEqual(['Olive', 'Κύκνος', 'Blush', 'Anchor']);

        const olive = screen.getByRole('heading', { level: 2, name: 'Olive' }).closest('article') as HTMLElement;
        expect(within(olive).getByAltText('Olive invitation design')).toBeInTheDocument();
        expect(within(olive).getByRole('link', { name: 'View design' })).toHaveAttribute('href', '/invitations/olive');
        expect(within(olive).getByRole('link', { name: 'Try it free' }).getAttribute('href')).toContain('theme=olive');
        expect(within(olive).getByText('Wedding')).toBeInTheDocument();
    });

    it('links each card to the Greek theme page in Greek', async () => {
        backend();
        renderCatalogue({ locale: 'el', path: '/el/prosklitiria' });
        const olive = (await screen.findByRole('heading', { level: 2, name: 'Olive' })).closest('article') as HTMLElement;
        expect(within(olive).getByRole('link', { name: el.SaveMyDateStorefront.catalogue.viewDesign })).toHaveAttribute('href', '/el/prosklitiria/olive');
        expect(within(olive).getByAltText('Σχέδιο προσκλητηρίου Olive')).toBeInTheDocument();
    });

    it('filters by event type and keeps the filter in the URL', async () => {
        backend();
        renderCatalogue();
        await screen.findByRole('heading', { level: 2, name: 'Olive' });

        const baptism = screen.getByRole('button', { name: 'Baptism' });
        fireEvent.click(baptism);
        expect(baptism).toHaveAttribute('aria-pressed', 'true');
        expect(cardNames()).toEqual(['Anchor']);
        expect(window.location.search).toBe('?type=BAPTISM');

        fireEvent.click(screen.getByRole('button', { name: 'All' }));
        expect(cardNames()).toHaveLength(4);
        expect(window.location.search).toBe('');
    });

    it('starts from the filters in the link', async () => {
        backend();
        renderCatalogue({ filters: readCatalogueFilters({ type: 'WEDDING', sort: 'az' }) });
        await screen.findByRole('heading', { level: 2, name: 'Olive' });
        expect(cardNames()).toEqual(['Blush', 'Olive', 'Κύκνος']);
        expect(screen.getByRole('button', { name: 'Wedding' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'A–Z' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('finds a Greek name typed without accents and says when nothing matches', async () => {
        backend();
        renderCatalogue();
        await screen.findByRole('heading', { level: 2, name: 'Olive' });
        const search = screen.getByRole('searchbox', { name: 'Search designs' });

        fireEvent.change(search, { target: { value: 'κυκνος' } });
        expect(cardNames()).toEqual(['Κύκνος']);

        fireEvent.change(search, { target: { value: 'zzz' } });
        expect(screen.getByRole('status')).toHaveTextContent('No designs found.');
    });

    it('sorts A to Z', async () => {
        backend();
        renderCatalogue();
        await screen.findByRole('heading', { level: 2, name: 'Olive' });
        fireEvent.click(screen.getByRole('button', { name: 'A–Z' }));
        expect(cardNames()).toEqual(['Anchor', 'Blush', 'Olive', 'Κύκνος']);
        expect(window.location.search).toBe('?sort=az');
    });

    it('remembers one or two columns on this device', async () => {
        backend();
        renderCatalogue();
        await screen.findByRole('heading', { level: 2, name: 'Olive' });
        const two = screen.getByRole('button', { name: 'Two columns' });
        expect(screen.getByRole('button', { name: 'One column' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(two);
        expect(two).toHaveAttribute('aria-pressed', 'true');
        expect(window.localStorage.getItem('storywall:theme-catalogue-columns')).toBe('2');
    });

    it('shows the next designs on "More designs"', async () => {
        backend(Array.from({ length: 30 }, (_, index) => card(`theme-${index}`, `Theme ${index}`)), []);
        renderCatalogue();
        await screen.findByRole('heading', { level: 2, name: 'Theme 0' });
        expect(cardNames()).toHaveLength(24);

        fireEvent.click(screen.getByRole('button', { name: 'More designs' }));
        expect(cardNames()).toHaveLength(30);
        expect(screen.queryByRole('button', { name: 'More designs' })).not.toBeInTheDocument();
    });

    it('says when there are no designs at all', async () => {
        backend([], []);
        renderCatalogue();
        expect(await screen.findByText('No designs found.')).toBeInTheDocument();
    });

    it('offers a retry when the designs fail to load', async () => {
        apiGet.mockRejectedValue(new Error('down'));
        renderCatalogue();
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent("The designs didn't load.");

        backend();
        fireEvent.click(within(alert).getByRole('button', { name: en.PageErrorState.retry }));
        await waitFor(() => expect(cardNames()).toHaveLength(4));
    });

    it('shows a loading state while the designs load', () => {
        apiGet.mockReturnValue(new Promise(() => {}));
        renderCatalogue();
        expect(screen.getByRole('status', { name: 'Loading designs' })).toBeInTheDocument();
    });
});
