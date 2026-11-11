import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/components/event/create/EventCreateFooter', () => ({ EventCreateFooter: () => <footer>old footer</footer> }));

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

    it('keeps the old footer on later steps until part 3', () => {
        form.current = { step: 'details' };
        render(<CreateEventWizardFooter />);
        expect(screen.getByText('old footer')).toBeInTheDocument();
    });
});
