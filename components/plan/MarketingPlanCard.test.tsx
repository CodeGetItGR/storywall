import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import type { LandingPlan } from '@/lib/landingPricing';

const messages = {
    Durations: {
        label: 'Duration',
        short: '{count}m',
        months: '{count, plural, one {# month} other {# months}}',
    },
};

const plan: LandingPlan = {
    code: 'STORY',
    name: 'STORY',
    audience: 'Up to 300 guests',
    storage: '25 GB',
    photos: '',
    videos: '',
    features: ['Everything in START', 'RSVP'],
    durations: [
        { id: 'd6', months: 6, price: '99€', listPrice: '129€' },
        { id: 'd9', months: 9, price: '109€', listPrice: null },
    ],
    defaultDurationId: 'd9',
};

function renderCard({
    defaultExpanded,
    durationId,
    onSelectAction,
    selected,
}: { defaultExpanded?: boolean; durationId?: string; onSelectAction?: (code: string) => void; selected?: boolean } = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <MarketingPlanCard
                featured={false}
                plan={plan}
                durationId={durationId}
                popularLabel="Most popular"
                durationLabel="Stays online for"
                listPriceLabel="Original price"
                expandLabel="Show features"
                collapseLabel="Hide features"
                defaultExpanded={defaultExpanded}
                selected={selected}
                selectionLabel={selected ? 'SELECTED' : 'CHOOSE PLAN'}
                onSelectAction={onSelectAction}
            />
        </NextIntlClientProvider>,
    );
}

function featureListOf(toggle: HTMLElement) {
    return document.getElementById(toggle.getAttribute('aria-controls') ?? '');
}

afterEach(cleanup);

describe('MarketingPlanCard', () => {
    it('names the duration switch with its visible label', () => {
        renderCard();
        expect(screen.getByText('Stays online for')).toBeInTheDocument();
        expect(screen.getByRole('radiogroup', { name: 'Stays online for' })).toBeInTheDocument();
    });

    it('spells out each duration in full', () => {
        renderCard();
        expect(screen.getByRole('radio', { name: '6 months' })).toHaveTextContent('6 months');
        expect(screen.getByRole('radio', { name: '9 months' })).toHaveTextContent('9 months');
    });

    it('shows the price before the promotion struck through beside the promoted one, with no percent', () => {
        renderCard({ durationId: 'd6' });

        const listPrice = screen.getByText('129€');
        expect(listPrice.closest('del')).toHaveTextContent('Original price 129€');
        expect(screen.getByText('99€')).toBeInTheDocument();
        expect(document.body.textContent).not.toContain('%');
    });

    it('shows no struck-through price when no promotion lowers the duration', () => {
        renderCard();
        expect(screen.getByText('109€')).toBeInTheDocument();
        expect(document.querySelector('del')).toBeNull();
    });

    it('shows members and storage on one line', () => {
        renderCard();
        expect(screen.getByText('Up to 300 guests · 25 GB')).toBeInTheDocument();
    });

    it('marks the selected plan as pressed', () => {
        renderCard({ onSelectAction: vi.fn(), selected: true });
        expect(screen.getByRole('button', { name: 'STORY' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('SELECTED')).toBeInTheDocument();
    });

    it('starts with the feature list collapsed on mobile', () => {
        renderCard();
        const toggle = screen.getByRole('button', { name: 'Show features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(featureListOf(toggle)).toHaveClass('hidden');
    });

    it('starts open when defaultExpanded is set', () => {
        renderCard({ defaultExpanded: true });
        const toggle = screen.getByRole('button', { name: 'Hide features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(featureListOf(toggle)).not.toHaveClass('hidden');
    });

    it('opens the feature list without selecting the plan', () => {
        const onSelectAction = vi.fn();
        renderCard({ onSelectAction });

        fireEvent.click(screen.getByRole('button', { name: 'Show features' }));

        const toggle = screen.getByRole('button', { name: 'Hide features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(featureListOf(toggle)).not.toHaveClass('hidden');
        expect(onSelectAction).not.toHaveBeenCalled();
    });

    it('selects the plan when the card is tapped', () => {
        const onSelectAction = vi.fn();
        renderCard({ onSelectAction });

        fireEvent.click(screen.getByRole('button', { name: 'STORY' }));

        expect(onSelectAction).toHaveBeenCalledWith('STORY');
    });
});
