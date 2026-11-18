import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { eventDetailsStorageKey, rememberEventDetailsValues } from '@/lib/eventDetailsForm';
import { getSupportedTimezones } from '@/lib/timezones';

import CheckoutReviewBoundary from './CheckoutReviewBoundary';

const mocks = vi.hoisted(() => ({
    search: 'intent=upgrade&code=START',
    hasSchedule: false,
    upgradeMutate: vi.fn(),
    navigateToCheckout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ eventId: 'event-1' }),
    useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
}));

vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));
vi.mock('@/components/ui/DateTimeField', () => ({
    DateTimeField: ({ value }: { value: string }) => <input aria-label="date" value={value} readOnly />,
}));
vi.mock('@/components/event/create/EventTimezoneField', () => ({ EventTimezoneField: () => null }));

vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'server message' }));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => ({}) }));
vi.mock('@/hooks/useCreateEventFieldLabels', () => ({
    useCreateEventFieldLabels: () => ({ title: 'title', startAt: 'startAt', locationName: 'locationName' }),
}));

vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        data: {
            planTiers: [
                { code: 'QR', name: 'QR', scope: 'EVENT', sortOrder: 0, priceCurrency: 'EUR' },
                { code: 'BUNDLE', name: 'Bundle', scope: 'EVENT', sortOrder: 1, priceCurrency: 'EUR' },
                { code: 'START', name: 'Start', scope: 'EVENT', sortOrder: 2, priceCurrency: 'EUR' },
            ],
            paidServices: [],
            withdrawal: { termsVersion: '2026-09-25' },
            coverage: { minDaysAfterStart: 7 },
        },
    }),
}));

vi.mock('@/hooks/useBilling', () => {
    const idle = { isPending: false, mutateAsync: vi.fn(), reset: vi.fn() };
    const option = { coverageOptionId: 'o1', months: 12, monthsAdded: 12, payableAmountMinor: 5_000, breakdown: null };
    return {
        useEventBilling: () => ({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: {
                planTierCode: 'QR',
                orders: [{ kind: 'ACTIVATION', status: 'PAID', createdAt: '2026-03-05T10:00:00', paidAt: '2026-03-05T10:00:00' }],
            },
        }),
        useUpgradeOptions: () => ({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: [
                { planTierCode: 'BUNDLE', planTierName: 'Bundle', currency: 'EUR', requirements: { needsSchedule: false }, options: [option] },
                { planTierCode: 'START', planTierName: 'Start', currency: 'EUR', requirements: { needsSchedule: true }, options: [option] },
            ],
        }),
        useUpgradeCheckout: () => ({ ...idle, mutateAsync: mocks.upgradeMutate }),
        useStorageCheckout: () => idle,
        useExtensionOptions: () => ({ isLoading: false, error: null, refetch: vi.fn(), data: undefined }),
        useExtensionCheckout: () => idle,
        useEventQuote: () => ({ isLoading: false, error: null, data: undefined }),
    };
});

vi.mock('@/hooks/useEvent', () => ({
    useEvent: () => ({
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        data: {
            id: 'event-1',
            title: 'Wedding',
            eventType: 'WEDDING',
            createdAt: '2026-03-01T10:00:00',
            schedule: { coverageEndsAt: '2030-01-01T00:00:00.000Z' },
            capabilities: { hasSchedule: mocks.hasSchedule },
        },
    }),
}));

vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => true }));
vi.mock('@/hooks/useBusinessProfile', () => ({
    useBusinessProfile: () => ({ canHaveProfile: true, isBusiness: false, isLoading: false, profile: null }),
    useCheckoutBuyer: () => ({ notice: null, legalName: '', vatNumber: '' }),
}));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: () => undefined }));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: mocks.navigateToCheckout,
}));

function remember(startAt = '2029-06-01T18:00') {
    rememberEventDetailsValues(eventDetailsStorageKey('event-1'), {
        startAt,
        timezone: getSupportedTimezones()[0],
        locationName: 'Hall',
        locationAddress: 'Main 1',
        mapsUrl: '',
    });
}

function pay() {
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /continueToCheckout/ }));
}

describe('CheckoutReviewBoundary — date and place on an upgrade', () => {
    afterEach(() => {
        cleanup();
        window.sessionStorage.clear();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.search = 'intent=upgrade&code=START';
        mocks.hasSchedule = false;
        mocks.upgradeMutate.mockResolvedValue({ orderId: 'order-1', redirectUrl: 'https://pay.example/1' });
    });

    it('goes straight to the review when the new plan needs no date', () => {
        mocks.search = 'intent=upgrade&code=BUNDLE';
        render(<CheckoutReviewBoundary />);

        expect(screen.queryByText('whenAndWhere')).toBeNull();
        expect(screen.getByRole('button', { name: /continueToCheckout/ })).toBeTruthy();
    });

    it('sends no details when the new plan needs no date', async () => {
        mocks.search = 'intent=upgrade&code=BUNDLE';
        remember();
        render(<CheckoutReviewBoundary />);

        pay();

        await waitFor(() => expect(mocks.upgradeMutate).toHaveBeenCalledOnce());
        expect(mocks.upgradeMutate.mock.calls[0][0]).not.toHaveProperty('details');
    });

    it('goes straight to the review when the event already has a date', () => {
        mocks.hasSchedule = true;
        render(<CheckoutReviewBoundary />);

        expect(screen.queryByText('whenAndWhere')).toBeNull();
    });

    it('asks first when the new plan needs a date and the event has none', () => {
        render(<CheckoutReviewBoundary />);

        expect(screen.getByRole('heading', { name: 'whenAndWhere' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'continueToOverview' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: /continueToCheckout/ })).toBeNull();
    });

    it('starts on the values remembered from an earlier attempt', () => {
        remember();
        render(<CheckoutReviewBoundary />);

        expect(screen.getByRole('heading', { name: 'whenAndWhere' })).toBeTruthy();
        expect(screen.getByLabelText('date')).toHaveValue('2029-06-01T18:00');
        expect(screen.getByRole('button', { name: 'continueToOverview' })).toBeEnabled();
    });

    it('shows the date and place on the review, and sends them with the checkout', async () => {
        remember();
        render(<CheckoutReviewBoundary />);

        fireEvent.click(screen.getByRole('button', { name: 'continueToOverview' }));

        expect(screen.getByText('Hall')).toBeTruthy();
        expect(screen.getByText('Main 1')).toBeTruthy();

        pay();

        await waitFor(() => expect(mocks.upgradeMutate).toHaveBeenCalledOnce());
        expect(mocks.upgradeMutate.mock.calls[0][0].details).toMatchObject({
            startAt: new Date('2029-06-01T18:00').toISOString(),
            locationName: 'Hall',
            locationAddress: 'Main 1',
        });
        expect(mocks.navigateToCheckout).toHaveBeenCalledOnce();
    });

    it('goes back to the details to change them', () => {
        remember();
        render(<CheckoutReviewBoundary />);
        fireEvent.click(screen.getByRole('button', { name: 'continueToOverview' }));

        fireEvent.click(screen.getByRole('button', { name: 'action' }));

        expect(screen.getByRole('heading', { name: 'whenAndWhere' })).toBeTruthy();
    });

    it.each([
        ['too far ahead', ERROR_CODES.EVENT_START_TOO_FAR_AHEAD, 'server message'],
        ['before the payment', ERROR_CODES.EVENT_START_BEFORE_PURCHASE, 'validation.startBeforePayment'],
    ])('goes back to the date with the error on it when the date is %s', async (_name, errorCode, message) => {
        mocks.upgradeMutate.mockRejectedValue(new ApiError(400, { errorCode }));
        remember();
        render(<CheckoutReviewBoundary />);
        fireEvent.click(screen.getByRole('button', { name: 'continueToOverview' }));

        pay();

        expect(await screen.findByRole('heading', { name: 'whenAndWhere' })).toBeTruthy();
        expect(screen.getByText(message)).toBeTruthy();
        expect(mocks.navigateToCheckout).not.toHaveBeenCalled();
    });

    it('stays on the review for an error that is not about the details', async () => {
        mocks.upgradeMutate.mockRejectedValue(new ApiError(500, { errorCode: 9999 }));
        remember();
        render(<CheckoutReviewBoundary />);
        fireEvent.click(screen.getByRole('button', { name: 'continueToOverview' }));

        pay();

        expect(await screen.findByText('server message')).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'whenAndWhere' })).toBeNull();
    });
});
