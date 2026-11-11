import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useCampaignPriceClock', () => ({ useCampaignPriceClock: () => undefined }));
vi.mock('@/lib/incident', () => ({ INCIDENT_MODE: false }));
vi.mock('@/components/event/create/EventOverviewError', () => ({ EventOverviewError: () => <p>overview error</p> }));
vi.mock('@/components/event/create/EventOverviewConsentHint', () => ({ EventOverviewConsentHint: () => <p>consent hint</p> }));
vi.mock('@/components/incident/IncidentPausedNote', () => ({ IncidentPausedNote: () => null }));

const PLAN = { code: 'STORY', name: 'STORY', priceCurrency: 'EUR', scope: 'EVENT' };

afterEach(cleanup);

describe('CreateEventWizardFooter', () => {
    it('names the type on the type step and moves to the plan', () => {
        const goToPlan = vi.fn();
        form.current = { step: 'type', selectedEventType: 'BAPTISM', canContinueType: true, goToPlan };
        render(<CreateEventWizardFooter />);
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.type.continue.baptism' }));
        expect(goToPlan).toHaveBeenCalled();
    });

    it('says "other" for a type without its own button', () => {
        form.current = { step: 'type', selectedEventType: 'BIRTHDAY', canContinueType: true, goToPlan: vi.fn() };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button')).toHaveTextContent('CreateEventPage.wizard.type.continue.other');
    });

    it('continues to details from the plan step, once a plan can be bought', () => {
        form.current = { step: 'plan', canContinuePlan: false, goToDetails: vi.fn() };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' })).toBeDisabled();
    });

    it('submits the details form with Continue', () => {
        form.current = { step: 'details', formId: 'create-form', canSubmitDetails: true };
        render(<CreateEventWizardFooter />);
        const button = screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' });
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).toHaveAttribute('form', 'create-form');
    });

    it('moves from theme to review with Continue', () => {
        const goToOverview = vi.fn();
        form.current = { step: 'theme', goToOverview };
        render(<CreateEventWizardFooter />);
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' }));
        expect(goToOverview).toHaveBeenCalled();
    });

    it('says Pay with the amount due on review, with the notes above it', () => {
        form.current = {
            step: 'overview',
            formId: 'create-form',
            eventPlans: [PLAN],
            selectedPlan: PLAN,
            selectedOption: { id: 'o6', months: 6, priceAmountMinor: 9900 },
            checkoutCodePreview: { payableAmountMinor: 0, currency: 'EUR' },
            isSubmitPending: false,
            isEmailVerified: true,
            consentSatisfied: true,
        };
        render(<CreateEventWizardFooter />);
        const button = screen.getByRole('button', { name: /CreateEventPage.wizard.review.pay:.*0\.00/ });
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).toBeEnabled();
        expect(screen.getByText('consent hint')).toBeInTheDocument();
    });

    it('waits for the consent boxes before paying', () => {
        form.current = {
            step: 'overview',
            formId: 'create-form',
            eventPlans: [PLAN],
            selectedPlan: PLAN,
            selectedOption: { id: 'o6', months: 6, priceAmountMinor: 9900 },
            checkoutCodePreview: null,
            isSubmitPending: false,
            isEmailVerified: true,
            consentSatisfied: false,
        };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button', { name: /CreateEventPage.wizard.review.pay/ })).toBeDisabled();
    });
});
