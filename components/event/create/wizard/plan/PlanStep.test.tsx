import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlanStep } from '@/components/event/create/wizard/plan/PlanStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const marketing = vi.hoisted(() => ({ current: { full: [] as unknown[], lite: [] as unknown[] } }));

vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/components/event/create/wizard/plan/PlansSheet', () => ({ PlansSheet: () => null }));
vi.mock('@/hooks/useCreateEventPlansSheet', () => ({ useCreateEventPlansSheet: () => ({ open: vi.fn() }) }));
vi.mock('@/hooks/useMarketingPlanOptions', () => ({ useMarketingPlanOptions: () => marketing.current }));
vi.mock('@/components/event/create/wizard/CreateEventFeatureIcon', () => ({ CreateEventFeatureIcon: () => null }));

function option(code: string, months = 6, price = '€99') {
    return { id: `${code}-${months}`, months, price, listPrice: null };
}
function entry(code: string, sortOrder: number, maxMembers: number | null, moduleKeys: string[]) {
    return {
        config: { code, name: code, sortOrder, maxMembers, moduleKeys },
        featured: false,
        presentation: {
            code,
            name: code,
            audience: `Up to ${maxMembers} guests`,
            storage: '25 GB',
            durations: [option(code), option(code, 12, '€119')],
            defaultDurationId: `${code}-6`,
        },
    };
}

function setup(
    selectedCode = 'STORY',
    plans: { full: unknown[]; lite: unknown[] } = {
        full: [
            entry('START', 1, 150, ['gallery', 'posts']),
            entry('STORY', 2, 300, ['gallery', 'posts', 'stories', 'rsvp']),
            entry('SIGNATURE', 3, 2500, ['gallery', 'posts', 'stories', 'rsvp']),
        ],
        lite: [],
    },
) {
    const onSelectPlan = vi.fn();
    const onSelectPlanDuration = vi.fn();
    marketing.current = plans;
    form.current = {
        eventPlans: [],
        modules: [],
        media: {},
        selectedCode,
        durationPicks: {},
        onSelectPlan,
        onSelectPlanDuration,
        isPlansLoading: false,
        selectedEventType: 'WEDDING',
    };
    render(<PlanStep />);
    return { onSelectPlan, onSelectPlanDuration };
}

afterEach(cleanup);

describe('PlanStep', () => {
    it('asks the guest count with one chip per plan, the picked plan chip checked', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.plan.heading');
        const chips = screen.getAllByRole('radio', { name: /CreateEventPage.wizard.plan/ });
        expect(chips.map((chip) => chip.textContent)).toEqual([
            'CreateEventPage.wizard.plan.upTo{"count":150}',
            'CreateEventPage.wizard.plan.upTo{"count":300}',
            'CreateEventPage.wizard.plan.moreThan{"count":300}',
        ]);
        expect(chips[1]).toHaveAttribute('aria-checked', 'true');
    });

    it('picks the plan of the tapped chip', () => {
        const { onSelectPlan } = setup();
        fireEvent.click(screen.getAllByRole('radio', { name: /CreateEventPage.wizard.plan/ })[0]);
        expect(onSelectPlan).toHaveBeenCalledWith('START');
    });

    it('shows the suggested plan card with its badge, price and what it adds', () => {
        setup();
        expect(screen.getByText('CreateEventPage.wizard.plan.bestFit')).toBeInTheDocument();
        expect(screen.getByText('STORY')).toBeInTheDocument();
        expect(screen.getByText('€99')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.plan.everythingInPlus{"plan":"START"}')).toBeInTheDocument();
        expect(screen.getByText('name:rsvp')).toBeInTheDocument();
    });

    it('changes the duration on the card', () => {
        const { onSelectPlanDuration } = setup();
        fireEvent.click(screen.getByRole('radio', { name: 'Durations.months{"count":12}' }));
        expect(onSelectPlanDuration).toHaveBeenCalledWith('STORY', 'STORY-12');
    });

    it('offers to compare the plans when there is more than one', () => {
        setup();
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.compare' })).toBeInTheDocument();
    });

    it('hides the compare link when only one plan is offered', () => {
        setup('STORY', { full: [entry('STORY', 1, 10, ['gallery', 'posts'])], lite: [] });
        expect(screen.getByText('STORY')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'CreateEventPage.wizard.plan.compare' })).not.toBeInTheDocument();
    });

    it('counts a lite plan as a second plan to compare', () => {
        setup('STORY', { full: [entry('STORY', 1, 10, ['gallery', 'posts'])], lite: [entry('LITE', 0, 10, ['gallery'])] });
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.compare' })).toBeInTheDocument();
    });
});
