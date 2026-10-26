import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingHero } from '@/components/occasions/wedding/WeddingHero';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
// The header needs auth and the client intl provider, the visual the motion provider; both are
// covered by their own tests.
vi.mock('@/components/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/occasions/OccasionHeroVisual', () => ({
    OccasionHeroVisual: ({ className }: { className?: string }) => <div className={className} data-testid="visual" />,
}));

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

function hero(overrides: Partial<Parameters<typeof WeddingHero>[0]> = {}) {
    return WeddingHero({
        alternatePaths: { el: '/el/gamos', en: '/weddings' },
        campaign: null,
        createHref: '/events/new?type=wedding',
        demoHref: '/demo/wedding/feed',
        locale: 'el',
        price: SPAN,
        ...overrides,
    });
}

afterEach(cleanup);

describe('WeddingHero', () => {
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

    it('links to create, and to the demo when there is one', async () => {
        render(await hero());
        expect(screen.getByRole('link', { name: /Φτιάξε το StoryWall σου/ })).toHaveAttribute('href', '/events/new?type=wedding');
        expect(screen.getByRole('link', { name: /Δες το demo/ })).toHaveAttribute('href', '/demo/wedding/feed');
        cleanup();
        render(await hero({ demoHref: null }));
        expect(screen.queryByRole('link', { name: /Δες το demo/ })).toBeNull();
    });

    it("shows the landing's phone and cards, placed as in the design", async () => {
        render(await hero());
        expect(screen.getByTestId('visual')).toHaveClass('w-[min(115%,510px)]', 'min-[901px]:w-[min(860px,54vw)]');
    });
});
