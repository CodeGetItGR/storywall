import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingPricing } from '@/components/landing/LandingPricing';
import type { LandingPricingGroup } from '@/hooks/useLandingPricingPlans';
import type { LandingPlan } from '@/lib/landingPricing';

const state = vi.hoisted(() => ({
    result: { groups: null, defaultEventTypeId: null } as { groups: unknown[] | null; defaultEventTypeId: string | null },
}));

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

const GROUPS: LandingPricingGroup[] = [
    {
        id: 'wed',
        label: 'Weddings',
        items: [
            {
                id: 'wedding',
                eventTypeKey: 'WEDDING',
                label: 'Wedding',
                plans: [landingPlan('START'), landingPlan('STORY'), landingPlan('SIGNATURE')],
            },
            { id: 'baby-shower', eventTypeKey: 'BABY_SHOWER', label: 'Baby shower', plans: [landingPlan('SHOWER')] },
        ],
    },
    {
        id: 'vip',
        label: 'VIP',
        items: [{ id: 'reunion', eventTypeKey: 'REUNION', label: 'Reunion', plans: [landingPlan('GOLD'), landingPlan('PLATINUM')] }],
    },
];

const cardNames = () => screen.getAllByTestId('plan-card').map((card) => card.textContent);

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('LandingPricing', () => {
    it('renders nothing before the config loads, or with no event type to show', () => {
        state.result = { groups: null, defaultEventTypeId: null };
        const { container, rerender } = render(<LandingPricing />);
        expect(container).toBeEmptyDOMElement();

        state.result = { groups: [], defaultEventTypeId: null };
        rerender(<LandingPricing />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows the default type's plans and names it on the picker", () => {
        state.result = { groups: GROUPS, defaultEventTypeId: 'wedding' };
        render(<LandingPricing />);

        expect(screen.getByRole('combobox', { name: 'eventTypeLabel' })).toHaveTextContent('Wedding');
        expect(cardNames()).toEqual(['START', 'STORY', 'SIGNATURE']);
    });

    it('opens on the type in ?event=', () => {
        window.history.replaceState(null, '', '/?event=reunion');
        state.result = { groups: GROUPS, defaultEventTypeId: 'wedding' };
        render(<LandingPricing />);

        expect(screen.getByRole('combobox', { name: 'eventTypeLabel' })).toHaveTextContent('Reunion');
        expect(cardNames()).toEqual(['GOLD', 'PLATINUM']);
    });

    it('lists the types by category, filters them by name, and switches the plans on a pick', async () => {
        state.result = { groups: GROUPS, defaultEventTypeId: 'wedding' };
        render(<LandingPricing />);

        await act(async () => fireEvent.click(screen.getByRole('combobox', { name: 'eventTypeLabel' })));
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Wedding', 'Baby shower', 'Reunion']);
        expect(screen.getByText('VIP')).toBeInTheDocument();

        await act(async () => fireEvent.change(screen.getByPlaceholderText('eventTypeSearch'), { target: { value: 'show' } }));
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Baby shower']);
        expect(screen.queryByText('VIP')).not.toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByRole('option', { name: 'Baby shower' })));
        expect(cardNames()).toEqual(['SHOWER']);
        expect(window.location.search).toBe('?event=baby-shower');
    });
});
