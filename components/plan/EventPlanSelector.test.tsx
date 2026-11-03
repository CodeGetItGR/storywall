import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import type { MarketingPlanOption } from '@/hooks/useMarketingPlanOptions';
import type { PlanTierResponseDto } from '@/lib/api/types';
import type { LandingPlan } from '@/lib/landingPricing';

const state = vi.hoisted(() => ({ options: { full: [], lite: [] } as unknown }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: { price?: string }) => (values?.price ? `${key} ${values.price}` : key),
}));
vi.mock('@/hooks/useMarketingPlanOptions', () => ({ useMarketingPlanOptions: () => state.options }));
vi.mock('@/components/plan/MarketingPlanCard', () => ({
    MarketingPlanCard: ({ plan }: { plan: LandingPlan }) => (
        <article>
            <span data-testid="plan-card">{plan.name}</span>
        </article>
    ),
}));

function option(code: string): MarketingPlanOption {
    return { config: { id: code, code } as PlanTierResponseDto, featured: false, presentation: { code, name: code } as LandingPlan };
}

const PLANS = [
    { id: 'QR', code: 'QR', moduleKeys: ['gallery'] },
    { id: 'START', code: 'START', moduleKeys: ['gallery', 'posts'] },
] as PlanTierResponseDto[];

function renderSelector(selectedCode: string) {
    return render(
        <EventPlanSelector
            durationPicks={{}}
            media={{} as never}
            modules={[]}
            onSelectAction={vi.fn()}
            onSelectDurationAction={vi.fn()}
            plans={PLANS}
            selectedCode={selectedCode}
        />,
    );
}

const cardNames = () => screen.getAllByTestId('plan-card').map((card) => card.textContent);

afterEach(cleanup);

describe('EventPlanSelector', () => {
    it('shows the lite plans in their own section under the full plans', () => {
        state.options = { full: [option('START')], lite: [option('QR')] };
        renderSelector('START');
        expect(screen.getByRole('region', { name: 'liteHeading' })).toHaveTextContent('liteIntro');
        expect(cardNames()).toEqual(['START', 'QR']);
    });

    it('shows no lite section without lite plans', () => {
        state.options = { full: [option('START')], lite: [] };
        renderSelector('START');
        expect(screen.queryByRole('region', { name: 'liteHeading' })).not.toBeInTheDocument();
        expect(cardNames()).toEqual(['START']);
    });
});
