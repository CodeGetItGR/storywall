import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingPricing } from '@/components/landing/LandingPricing';
import type { LandingPricingTab } from '@/hooks/useLandingPricingPlans';
import type { LandingPlan } from '@/lib/landingPricing';

const state = vi.hoisted(() => ({ result: { tabs: null, defaultTabId: null } as { tabs: unknown[] | null; defaultTabId: string | null } }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useLandingPricingPlans', () => ({ useLandingPricingPlans: () => state.result }));
vi.mock('@/components/plan/MarketingPlanCard', () => ({
    MarketingPlanCard: ({ plan }: { plan: LandingPlan }) => <article data-testid="plan-card">{plan.name}</article>,
}));

function landingPlan(code: string): LandingPlan {
    return {
        code,
        name: code,
        audience: '',
        features: [],
        photos: '',
        storage: '',
        videos: '',
        durations: [{ id: 'o', months: 3, price: '79€', listPrice: null }],
        defaultDurationId: 'o',
    };
}

const TABS: LandingPricingTab[] = [
    { id: 'wed', label: 'Weddings', description: '', plans: [landingPlan('START')] },
    { id: 'vip', label: 'VIP', description: 'Parties and reunions', plans: [landingPlan('GOLD'), landingPlan('PLATINUM')] },
];

afterEach(cleanup);

describe('LandingPricing', () => {
    it('renders nothing before the config loads, or with no tab to show', () => {
        state.result = { tabs: null, defaultTabId: null };
        const { container, rerender } = render(<LandingPricing />);
        expect(container).toBeEmptyDOMElement();

        state.result = { tabs: [], defaultTabId: null };
        rerender(<LandingPricing />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the tabs with their descriptions, opening the default one', () => {
        state.result = { tabs: TABS, defaultTabId: 'vip' };
        render(<LandingPricing />);

        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Weddings', 'VIPParties and reunions']);
        expect(screen.getByRole('tab', { name: /VIP/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getAllByTestId('plan-card').map((card) => card.textContent)).toEqual(['GOLD', 'PLATINUM']);

        fireEvent.click(screen.getByRole('tab', { name: 'Weddings' }));
        expect(screen.getAllByTestId('plan-card').map((card) => card.textContent)).toEqual(['START']);
    });
});
