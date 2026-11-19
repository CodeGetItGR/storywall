import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));
vi.mock('@/lib/planTiers', () => ({ getOptionPriceDetails: () => ({ amountMinor: 4_900, currency: 'EUR' }) }));
vi.mock('@/components/event/create/EventTitleField', () => ({ EventTitleField: () => <input aria-label="title field" /> }));
vi.mock('@/components/event/create/EventGiftFields', () => ({ EventGiftFields: () => <div>gift fields</div> }));
vi.mock('@/components/event/create/EventOverviewDiscountCode', () => ({ EventOverviewDiscountCode: () => null }));
vi.mock('@/components/checkout/WithdrawalConsentSection', () => ({ WithdrawalConsentSection: () => null }));
vi.mock('@/components/checkout/PartnerBrandingNotice', () => ({ PartnerBrandingNotice: () => null }));

function renderStep(overrides: Record<string, unknown>) {
    form.current = { ...form.current, ...overrides };
    render(<EventOverviewStep />);
}

describe('EventOverviewStep', () => {
    beforeEach(() => {
        form.current = {
            trimmedTitle: 'Our wedding',
            selectedEventType: 'WEDDING',
            eventTypes: [{ eventTypeKey: 'WEDDING' }],
            startAt: '2027-01-15T18:00',
            projectedCoverage: null,
            selectedPlan: { name: 'QR' },
            selectedOption: { months: 6 },
        };
    });
    afterEach(cleanup);

    it('asks for the title and gift on a plan without a details step, with no date', () => {
        renderStep({ asksDetails: false, startAt: '2027-01-15T18:00' });

        expect(screen.getByRole('textbox', { name: 'title field' })).toBeTruthy();
        expect(screen.getByText('gift fields')).toBeTruthy();
        // The title has one home: its field. The typed-then-abandoned date isn't shown.
        expect(screen.queryByText('Our wedding')).toBeNull();
        expect(screen.getByText('Wedding').textContent).toBe('Wedding');
        expect(screen.queryByText('datesFixedTitle')).toBeNull();
    });

    it('puts the title above the price', () => {
        renderStep({ asksDetails: false });
        const field = screen.getByRole('textbox', { name: 'title field' });
        const pricing = screen.getByRole('heading', { name: 'overview.pricing' });
        expect(field.compareDocumentPosition(pricing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('sums up what the details step asked on a full plan', () => {
        renderStep({ asksDetails: true });

        expect(screen.queryByRole('textbox', { name: 'title field' })).toBeNull();
        expect(screen.queryByText('gift fields')).toBeNull();
        expect(screen.getByText('Our wedding')).toBeTruthy();
        expect(screen.getByText(/Wedding ·/)).toBeTruthy();
        expect(screen.getByText('datesFixedTitle')).toBeTruthy();
    });
});
