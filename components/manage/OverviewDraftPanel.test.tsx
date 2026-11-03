import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewDraftPanel } from '@/components/manage/OverviewDraftPanel';

const mocks = vi.hoisted(() => ({ durationStartAt: undefined as string | null | undefined, quoteEnabled: undefined as boolean | undefined }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));
vi.mock('@/hooks/useDraftDuration', () => ({
    useDraftDuration: ({ startAt }: { startAt: string | null }) => {
        mocks.durationStartAt = startAt;
        return { isSaving: false, selectedTooShort: false, tooShortOptionIds: [], selectedOptionId: 'o', changeDuration: vi.fn(), error: null };
    },
}));
vi.mock('@/hooks/useDraftActivationCheckout', () => ({
    useDraftActivationCheckout: (_id: string, { quoteEnabled }: { quoteEnabled: boolean }) => {
        mocks.quoteEnabled = quoteEnabled;
        return {
            consent: { consentSatisfied: true },
            partnerBranding: { satisfied: true, notice: null },
            collaborationPreview: null,
            breakdown: null,
            handleCollaborationPreviewChange: vi.fn(),
            submit: vi.fn(),
            error: null,
            startPassed: false,
            isPending: false,
        };
    },
}));
vi.mock('@/hooks/useDraftStartDate', () => ({ useDraftStartDate: () => ({ open: vi.fn() }) }));
vi.mock('@/components/manage/DraftStartDateModal', () => ({ DraftStartDateModal: () => <div>start date modal</div> }));
vi.mock('@/components/manage/DraftDeleteSection', () => ({ DraftDeleteSection: () => null }));
vi.mock('@/components/checkout/CollaborationCodeSection', () => ({ CollaborationCodeSection: () => null }));
vi.mock('@/components/checkout/WithdrawalConsentSection', () => ({ WithdrawalConsentSection: () => <div>consent</div> }));
vi.mock('@/components/checkout/PartnerBrandingNotice', () => ({ PartnerBrandingNotice: () => null }));
vi.mock('@/components/checkout/PriceBreakdownSummary', () => ({ PriceBreakdownSummary: () => null }));
vi.mock('@/components/DurationPicker', () => ({ DurationPicker: () => null }));

const OPTION = { id: 'o', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null };
const PLAN = { name: 'QR', priceCurrency: 'EUR' };

function renderPanel(props: { asksStartDate: boolean; startAt: string | null }) {
    render(
        <OverviewDraftPanel
            eventId="e1"
            eventTitle="Our wedding"
            eventType="WEDDING"
            endAt={null}
            projectedCoverage={null}
            currentPlan={PLAN as never}
            currentOption={OPTION as never}
            savedOptionId="o"
            durationOptions={[OPTION] as never}
            durationUnavailable={false}
            canPurchase
            currency="EUR"
            selectedAddons={[]}
            activationTotal={4_900}
            wishlistAvailable={false}
            cancelledCheckout={false}
            {...props}
        />,
    );
}

describe('OverviewDraftPanel', () => {
    afterEach(cleanup);

    it('lets a lite draft pay without a date, and has no date to move', () => {
        renderPanel({ asksStartDate: false, startAt: null });

        expect(screen.getByRole('button', { name: /draft.payAndPublish/ })).toBeTruthy();
        expect(screen.queryByText('draft.addStartDate')).toBeNull();
        expect(screen.getByText('consent')).toBeTruthy();
        expect(screen.queryByText('start date modal')).toBeNull();
        expect(screen.queryByText('datesFixedTitle')).toBeNull();
        expect(mocks.quoteEnabled).toBe(true);
    });

    it('does not limit a lite draft\'s durations by a date it may still hold', () => {
        renderPanel({ asksStartDate: false, startAt: '2027-06-01T10:00:00Z' });
        expect(mocks.durationStartAt).toBeNull();
    });

    it('still asks a full draft without a date for one', () => {
        renderPanel({ asksStartDate: true, startAt: null });

        expect(screen.getByText('draft.addStartDate')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /draft.payAndPublish/ })).toBeNull();
        expect(screen.queryByText('consent')).toBeNull();
        expect(mocks.quoteEnabled).toBe(false);
    });

    it('lets a full draft with a date pay, as before', () => {
        renderPanel({ asksStartDate: true, startAt: '2027-06-01T10:00:00Z' });

        expect(screen.getByRole('button', { name: /draft.payAndPublish/ })).toBeTruthy();
        expect(screen.getByText('start date modal')).toBeTruthy();
        expect(screen.getByText('datesFixedTitle')).toBeTruthy();
        expect(mocks.durationStartAt).toBe('2027-06-01T10:00:00Z');
    });
});
