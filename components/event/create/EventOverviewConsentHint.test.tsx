import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventOverviewConsentHint } from '@/components/event/create/EventOverviewConsentHint';

const state = vi.hoisted(() => ({ form: {} as Record<string, unknown>, focus: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => state.form }));
vi.mock('@/lib/createEventSteps', () => ({ focusFirstUncheckedBox: state.focus }));

function setup(variant?: 'link' | 'chip', overrides: Record<string, unknown> = {}) {
    state.form = { formId: 'create-form', consentSatisfied: false, error: null, ...overrides };
    render(<EventOverviewConsentHint variant={variant} />);
}

afterEach(() => {
    cleanup();
    state.focus.mockReset();
});

describe('EventOverviewConsentHint', () => {
    it('scrolls to the boxes without a highlight as a link', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.overview.consentHint' }));
        expect(state.focus).toHaveBeenCalledWith('create-form', { highlight: false });
    });

    it('scrolls to the boxes and highlights them as a chip', () => {
        setup('chip');
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.overview.consentHint' }));
        expect(state.focus).toHaveBeenCalledWith('create-form', { highlight: true });
    });

    it('hides once the boxes are ticked', () => {
        setup('chip', { consentSatisfied: true });
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('gives way to the submit error', () => {
        setup('chip', { error: 'Payment failed' });
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
