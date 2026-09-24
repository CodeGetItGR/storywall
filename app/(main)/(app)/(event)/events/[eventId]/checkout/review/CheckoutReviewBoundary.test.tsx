import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutReviewBoundary from './CheckoutReviewBoundary';

const mocks = vi.hoisted(() => ({
    storageMutate: vi.fn(),
    navigateToCheckout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ eventId: 'event-1' }),
    useSearchParams: () => new URLSearchParams('intent=storage&code=STORAGE_5GB'),
}));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
}));

vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));

vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'genericError' }));

vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        data: {
            planTiers: [{ code: 'BASIC', name: 'Basic', scope: 'EVENT', sortOrder: 0, priceCurrency: 'EUR' }],
            paidServices: [{ code: 'STORAGE_5GB', kind: 'STORAGE_PACK', name: '5 GB', priceAmountMinor: 500, priceCurrency: 'EUR' }],
            withdrawal: { termsVersion: '2026-09-25' },
        },
    }),
}));

vi.mock('@/hooks/useBilling', () => {
    const idle = { isPending: false, mutateAsync: vi.fn(), reset: vi.fn() };
    return {
        useEventBilling: () => ({ isLoading: false, error: null, refetch: vi.fn(), data: { planTierCode: 'BASIC' } }),
        useUpgradeOptions: () => ({ isLoading: false, error: null, refetch: vi.fn(), data: [] }),
        useUpgradeCheckout: () => idle,
        useStorageCheckout: () => ({ ...idle, mutateAsync: mocks.storageMutate }),
        useExtensionOptions: () => ({ isLoading: false, error: null, refetch: vi.fn(), data: undefined }),
        useExtensionCheckout: () => idle,
    };
});

vi.mock('@/hooks/useEvent', () => ({
    useEvent: () => ({ isLoading: false, error: null, refetch: vi.fn(), data: { title: 'Wedding' } }),
}));

vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => true }));

vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: () => undefined }));

vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: mocks.navigateToCheckout,
}));

describe('CheckoutReviewBoundary — storage pack', () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.storageMutate.mockResolvedValue({ orderId: 'order-1', redirectUrl: 'https://pay.example/1' });
    });

    it('asks for withdrawal consent before a storage pack can be bought', () => {
        render(<CheckoutReviewBoundary />);

        expect(screen.getByText('withdrawalTerms.storageBody')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continueToCheckout/ })).toBeDisabled();
    });

    it('sends the consent and the current terms version with the storage checkout', async () => {
        render(<CheckoutReviewBoundary />);

        for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
        fireEvent.click(screen.getByRole('button', { name: /continueToCheckout/ }));

        await waitFor(() => expect(mocks.storageMutate).toHaveBeenCalledOnce());
        expect(mocks.storageMutate).toHaveBeenCalledWith({
            paidServiceCode: 'STORAGE_5GB',
            requestsImmediateStart: true,
            acknowledgesWithdrawalTerms: true,
            termsVersion: '2026-09-25',
        });
        expect(mocks.navigateToCheckout).toHaveBeenCalledOnce();
    });
});
