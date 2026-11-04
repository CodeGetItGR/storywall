import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/components/event/create/EventOverviewConsentHint', () => ({ EventOverviewConsentHint: () => null }));
vi.mock('@/components/event/create/EventOverviewError', () => ({ EventOverviewError: () => null }));
vi.mock('@/components/incident/IncidentPausedNote', () => ({ IncidentPausedNote: () => null }));
vi.mock('@/lib/incident', () => ({ INCIDENT_MODE: false }));

const goToNextStep = vi.fn();
const goToPreviousStep = vi.fn();

function renderFooter(overrides: Record<string, unknown>) {
    form.current = {
        formId: 'f',
        canContinuePlan: true,
        canSubmitDetails: true,
        isEmailVerified: true,
        consentSatisfied: true,
        isSubmitPending: false,
        themeStepAvailable: false,
        goToNextStep,
        goToPreviousStep,
        ...overrides,
    };
    render(<EventCreateFooter />);
}

describe('EventCreateFooter', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it.each([
        ['details', 'continueToDetails'],
        ['theme', 'continueToTheme'],
        ['overview', 'continueToOverview'],
    ])('names the step the plan continues to: %s', (stepAfterPlan, label) => {
        renderFooter({ step: 'plan', stepAfterPlan });
        fireEvent.click(screen.getByRole('button', { name: label }));
        expect(goToNextStep).toHaveBeenCalledTimes(1);
    });

    it.each(['theme', 'overview'])('goes back a shown step from %s', (step) => {
        renderFooter({ step });
        fireEvent.click(screen.getByRole('button', { name: 'actions.back' }));
        expect(goToPreviousStep).toHaveBeenCalledTimes(1);
    });

    it('holds paying back until the title is there', () => {
        renderFooter({ step: 'overview', canSubmitDetails: false });
        expect(screen.getByRole('button', { name: 'submitAndPay' })).toHaveProperty('disabled', true);
    });

    it('lets the host pay once the title is there', () => {
        renderFooter({ step: 'overview' });
        expect(screen.getByRole('button', { name: 'submitAndPay' })).toHaveProperty('disabled', false);
    });
});
