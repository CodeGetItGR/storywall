import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import type { MarketingPlanOption } from '@/hooks/useMarketingPlanOptions';
import type { PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import type { LandingPlan } from '@/lib/landingPricing';

const state = vi.hoisted(() => ({ options: { full: [], lite: [] } as unknown }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: { name?: string; price?: string }) =>
        values?.price ? [key, values.name, values.price].filter(Boolean).join(' ') : key,
}));
vi.mock('@/hooks/useMarketingPlanOptions', () => ({ useMarketingPlanOptions: () => state.options }));
vi.mock('@/components/plan/MarketingPlanCard', () => ({
    MarketingPlanCard: ({ plan, footer }: { plan: LandingPlan; footer?: ReactNode }) => (
        <article data-testid={`card-${plan.code}`}>
            <span data-testid="plan-card">{plan.name}</span>
            {footer}
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

function renderSelector(selectedCode: string, planAddons?: Record<string, PaidServiceResponseDto>) {
    return render(
        <EventPlanSelector
            durationPicks={{}}
            media={{} as never}
            modules={[]}
            onSelectAction={vi.fn()}
            onSelectDurationAction={vi.fn()}
            plans={PLANS}
            selectedCode={selectedCode}
            planAddons={planAddons}
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

    it("shows an add-on line under the plans that sell it, on full and lite cards", () => {
        state.options = { full: [option('START')], lite: [option('QR')] };
        const addon = { code: 'SMD', name: 'Online invitation', priceAmountMinor: 2900, priceCurrency: 'EUR' } as PaidServiceResponseDto;
        renderSelector('START', { QR: addon });
        expect(screen.getByTestId('card-QR')).toHaveTextContent('planAddOn Online invitation');
        expect(screen.getByTestId('card-START')).not.toHaveTextContent('planAddOn');
    });
});
