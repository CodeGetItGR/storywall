import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventOverviewConsentHint } from '@/components/event/create/EventOverviewConsentHint';

const state = vi.hoisted(() => ({ form: {} as Record<string, unknown>, focus: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => state.form }));
vi.mock('@/lib/createEventSteps', () => ({ focusFirstUncheckedBox: state.focus }));

function setup(highlight?: boolean, overrides: Record<string, unknown> = {}) {
    state.form = { formId: 'create-form', consentSatisfied: false, error: null, ...overrides };
    render(<EventOverviewConsentHint highlight={highlight} />);
}

afterEach(() => {
    cleanup();
    state.focus.mockReset();
});

describe('EventOverviewConsentHint', () => {
    it('scrolls to the boxes without a highlight by default', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.overview.consentHint' }));
        expect(state.focus).toHaveBeenCalledWith('create-form', { highlight: false });
    });

    it('scrolls to the boxes and highlights them when asked', () => {
        setup(true);
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.overview.consentHint' }));
        expect(state.focus).toHaveBeenCalledWith('create-form', { highlight: true });
    });

    it('shows a label passed in instead of the shared line', () => {
        state.form = { formId: 'create-form', consentSatisfied: false, error: null };
        render(<EventOverviewConsentHint highlight label="Tick the boxes to continue." />);
        expect(screen.getByRole('button', { name: 'Tick the boxes to continue.' })).toBeInTheDocument();
    });

    it('hides once the boxes are ticked', () => {
        setup(true, { consentSatisfied: true });
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('gives way to the submit error', () => {
        setup(true, { error: 'Payment failed' });
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
