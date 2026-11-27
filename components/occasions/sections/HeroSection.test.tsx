import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeroSection } from '@/components/occasions/sections/HeroSection';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { findOccasion } from '@/lib/occasions/occasions';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const auth = vi.hoisted(() => ({ isAuthenticated: false, isBootstrapping: false }));

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
// The header needs auth and the client intl provider, the visual the motion provider; both are
// covered by their own tests.
vi.mock('@/components/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/occasions/OccasionHeroVisual', () => ({
    OccasionHeroVisual: ({ className, feed, posts }: { className?: string; feed?: ReactNode; posts?: readonly ReactNode[] }) => (
        <div className={className} data-testid="visual">
            {feed}
            {posts}
        </div>
    ),
}));
// The post cards read their alt text with useTranslations.
vi.mock('next-intl', async (importOriginal) =>
    (await import('@/components/occasions/sections/__fixtures__/intlClientMock')).withGreekMessages(await importOriginal()),
);

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

function hero(overrides: Partial<Parameters<typeof HeroSection>[0]> = {}) {
    return HeroSection({
        campaign: null,
        createHref: '/events/new?type=wedding',
        demoHref: '/demo/wedding/feed',
        locale: 'el',
        media: WEDDING_PAGE_MEDIA,
        occasion: findOccasion('WEDDING')!,
        price: SPAN,
        qrHref: null,
        themesHref: null,
        ...overrides,
    });
}

afterEach(() => {
    cleanup();
    auth.isAuthenticated = false;
});

describe('HeroSection (wedding)', () => {
    it('has one h1, the keyword', async () => {
        render(await hero());
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('Ηλεκτρονικό προσκλητήριο γάμου & ιστοσελίδα γάμου');
        expect(headings[0]!.querySelector('em')).toHaveTextContent('ιστοσελίδα γάμου');
    });

    it('shows a breadcrumb back to the landing', async () => {
        render(await hero());
        const crumb = screen.getByRole('navigation', { name: 'Διαδρομή' });
        expect(within(crumb).getByRole('link', { name: 'StoryWall' })).toHaveAttribute('href', '/el');
        expect(within(crumb).getByText('Γάμος')).toHaveAttribute('aria-current', 'page');
    });

    it('names the lowest price only when config has one', async () => {
        render(await hero());
        expect(screen.getByText('Από 119€')).toBeInTheDocument();
        cleanup();
        render(await hero({ price: NONE }));
        expect(screen.getByText('Με ένα link')).toBeInTheDocument();
        expect(screen.queryByText(/€/)).toBeNull();
    });

    it('links to the QR page while it is live, and counts the clicks', async () => {
        render(await hero({ qrHref: '/el/qr-code-gamou' }));
        const link = screen.getByRole('link', { name: 'QR code για φωτογραφίες γάμου' });
        expect(link).toHaveAttribute('href', '/el/qr-code-gamou');
        expect(link).toHaveAttribute('data-link-click', 'QR_WEDDING:hero');
        cleanup();
        render(await hero());
        expect(screen.queryByRole('link', { name: /QR code/ })).toBeNull();
    });

    it('shows signed-out visitors the plans first, and the demo when there is one', async () => {
        render(await hero());
        expect(screen.getByRole('link', { name: 'Δες τα πακέτα' })).toHaveAttribute('href', '#pricing');
        expect(screen.queryByRole('link', { name: /Φτιάξε το StoryWall σου/ })).toBeNull();
        expect(screen.getByRole('link', { name: 'Demo' })).toHaveAttribute('href', '/demo/wedding/feed');
        cleanup();
        render(await hero({ demoHref: null }));
        expect(screen.queryByRole('link', { name: 'Demo' })).toBeNull();
    });

    it('sends signed-in visitors straight to create', async () => {
        auth.isAuthenticated = true;
        render(await hero());
        expect(screen.getByRole('link', { name: 'Φτιάξε το StoryWall σου' })).toHaveAttribute('href', '/events/new?type=wedding');
        expect(screen.queryByRole('link', { name: 'Δες τα πακέτα' })).toBeNull();
    });

    it('draws its buttons without arrows', async () => {
        render(await hero());
        expect(screen.queryByText(/[↗↓]/)).toBeNull();
    });

    it("shows the landing's phone and cards, placed as in the design", async () => {
        render(await hero());
        expect(screen.getByTestId('visual')).toHaveClass('w-[137vw]', 'min-[901px]:w-[min(860px,54vw)]');
    });

    it('shows no second button when there is neither a demo nor themes', async () => {
        render(await hero({ demoHref: null, themesHref: null }));
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['StoryWall', 'Δες τα πακέτα']);
    });
});

describe('HeroSection (baptism)', () => {
    const baptism = (overrides: Partial<Parameters<typeof HeroSection>[0]> = {}) =>
        HeroSection({
            campaign: null,
            createHref: '/events/new?type=baptism',
            demoHref: null,
            locale: 'el',
            media: BAPTISM_PAGE_MEDIA,
            occasion: findOccasion('BAPTISM')!,
            price: SPAN,
            qrHref: null,
            themesHref: '#themes',
            ...overrides,
        });

    it('has one h1, the keyword', async () => {
        render(await baptism());
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ηλεκτρονικό προσκλητήριο βάπτισης & ιστοσελίδα βάπτισης');
    });

    it('sends the second button to the themes, with no demo and no QR link', async () => {
        render(await baptism());
        const themes = screen.getByRole('link', { name: 'Δες τα θέματα' });
        expect(themes).toHaveAttribute('href', '#themes');
        expect(JSON.parse(themes.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero', target: 'themes' });
        expect(screen.queryByRole('link', { name: 'Demo' })).toBeNull();
        expect(screen.queryByRole('link', { name: /QR code/ })).toBeNull();
    });

    it('shows its own feed screenshot and two baptism post cards in the phone', async () => {
        render(await baptism());
        const visual = screen.getByTestId('visual');
        expect(within(visual).getByRole('img', { name: 'Η αρχική σελίδα μιας βάπτισης στο StoryWall με θέμα Μονόκερος' }).getAttribute('src')).toContain(
            'baptism-event-feed-unicorn-theme',
        );
        expect(within(visual).getAllByRole('img', { name: 'Φωτογραφία καλεσμένου' })).toHaveLength(2);
    });

    it('names its lowest price', async () => {
        render(await baptism({ price: { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' } }));
        expect(screen.getByText('Από 79€')).toBeInTheDocument();
    });
});
