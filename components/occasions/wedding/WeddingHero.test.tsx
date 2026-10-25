import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingHero } from '@/components/occasions/wedding/WeddingHero';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
// The parts read their alt text with useTranslations.
vi.mock('next-intl', async (importOriginal) =>
    (await import('@/components/occasions/wedding/__fixtures__/intlClientMock')).withGreekMessages(await importOriginal()),
);
// The header needs auth and the client intl provider, the visual the motion provider; both are
// covered by their own tests.
vi.mock('@/components/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/occasions/OccasionHeroVisual', () => ({
    OccasionHeroVisual: ({ comments, feed, posts }: { comments: ReactNode[]; feed: ReactNode; posts: ReactNode[] }) => (
        <div data-testid="visual">
            {feed}
            {posts}
            {comments}
        </div>
    ),
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
        expect(headings[0]).toHaveTextContent('Ηλεκτρονικό προσκλητήριο & ιστοσελίδα γάμου');
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

    it('draws the phone feed and the cards beside it', async () => {
        render(await hero());
        const visual = screen.getByTestId('visual');
        expect(within(visual).getByText('James & Olivia')).toBeInTheDocument();
        expect(within(visual).getAllByRole('article')).toHaveLength(9);
        // 9 posts' photos and faces, plus the two post cards' and the three comment faces.
        expect(visual.querySelectorAll('[class*="aspect-[705/360]"], [class*="aspect-[557/300]"]')).toHaveLength(2);
    });
});
