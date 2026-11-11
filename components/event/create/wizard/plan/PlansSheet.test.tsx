import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlansSheet } from '@/components/event/create/wizard/plan/PlansSheet';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const history = vi.hoisted(() => ({ leaveWizardEntry: vi.fn(), pushWizardEntry: vi.fn() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => params.current }));
vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/lib/createEventWizardHistory', () => history);
vi.mock('@/components/ui/modal', () => ({
    Modal: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
}));

function entry(code: string, sortOrder: number, moduleKeys: string[]) {
    return {
        config: { code, name: code, sortOrder, maxMembers: 100 * sortOrder, moduleKeys },
        featured: false,
        presentation: {
            code,
            name: code,
            audience: `Up to ${100 * sortOrder} guests`,
            storage: '25 GB',
            durations: [{ id: `${code}-3`, months: 3, price: `€${sortOrder}9`, listPrice: null }],
            defaultDurationId: `${code}-3`,
        },
    };
}
vi.mock('@/hooks/useMarketingPlanOptions', () => ({
    useMarketingPlanOptions: () => ({
        full: [
            entry('START', 1, ['gallery', 'qr_cards', 'playlist', 'schedule']),
            entry('STORY', 2, ['gallery', 'qr_cards', 'playlist', 'schedule', 'rsvp']),
        ],
        lite: [entry('QR', 5, ['gallery'])],
    }),
}));

beforeEach(() => {
    params.current = new URLSearchParams('create=1&step=plan&sheet=plans');
    form.current = {
        eventPlans: [],
        modules: [],
        media: {},
        selectedCode: 'START',
        durationPicks: {},
        onSelectPlan: vi.fn(),
        selectedEventType: 'WEDDING',
    };
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PlansSheet', () => {
    it('stays shut without the sheet param', () => {
        params.current = new URLSearchParams('create=1&step=plan');
        render(<PlansSheet />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('lists the full plans with their lines and prices, then the lite ones', () => {
        render(<PlansSheet />);
        expect(screen.getByText('CreateEventPage.wizard.plans.andMore{"features":"name:gallery, name:qr_cards, name:playlist"}')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.plans.everythingInPlus{"plan":"START","features":"name:rsvp"}')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.typeStartingPrice{"price":"€19"}')).toBeInTheDocument();
        expect(screen.getByText('LandingPage.pricing.liteHeading')).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('picks the chosen row and closes', () => {
        render(<PlansSheet />);
        fireEvent.click(screen.getByRole('radio', { name: /STORY/ }));
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.plans.choose{"plan":"STORY"}' }));
        expect(form.current.onSelectPlan).toHaveBeenCalledWith('STORY');
        expect(history.leaveWizardEntry).toHaveBeenCalledWith('sheet', expect.not.stringContaining('sheet='));
    });
});
