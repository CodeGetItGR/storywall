import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDraftActivationCheckout } from '@/hooks/useDraftActivationCheckout';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({
    checkout: vi.fn(),
    navigate: vi.fn(),
    quote: { data: undefined as unknown, error: null as unknown },
}));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: vi.fn() }));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: mocks.navigate,
}));
vi.mock('@/hooks/useBilling', () => ({
    billingKeys: { event: (id: string) => ['events', id, 'billing'] },
    useCheckout: () => ({ mutateAsync: mocks.checkout, isPending: false, reset: vi.fn() }),
    useEventQuote: () => mocks.quote,
}));
vi.mock('@/hooks/useWithdrawalConsent', () => ({
    useWithdrawalConsent: () => ({
        consentSatisfied: true,
        termsVersion: 'v1',
        requestsImmediateStart: true,
        acknowledgesWithdrawalTerms: true,
        handleCheckoutError: () => false,
    }),
}));

const START = '2026-09-01T18:00:00Z';

describe('useDraftActivationCheckout', () => {
    beforeEach(() => {
        mocks.checkout.mockReset();
        mocks.quote = { data: undefined, error: null };
    });

    it('comes back to the given page after paying', async () => {
        mocks.checkout.mockResolvedValue({ orderId: 'ord-1', redirectUrl: 'https://pay.test' });
        const { result } = renderHook(() =>
            useDraftActivationCheckout('event-1', { quoteEnabled: false, startAt: START, returnTo: '/save-my-date/editor/draft-1?publish=1' }),
        );

        await act(() => result.current.submit());
        expect(mocks.navigate).toHaveBeenCalledWith(
            'event-1',
            expect.objectContaining({ orderId: 'ord-1' }),
            undefined,
            '/save-my-date/editor/draft-1?publish=1',
        );
    });

    it('flags a passed start date from checkout (3035) until the date moves', async () => {
        mocks.checkout.mockRejectedValue(new ApiError(400, { errorCode: 3035 }));
        const { result, rerender } = renderHook(({ startAt }) => useDraftActivationCheckout('event-1', { quoteEnabled: false, startAt }), {
            initialProps: { startAt: START },
        });

        await act(() => result.current.submit());
        expect(result.current.startPassed).toBe(true);
        expect(result.current.error).toBe('api-3035');

        rerender({ startAt: '2026-12-01T18:00:00Z' });
        expect(result.current.startPassed).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('flags a passed start date from the quote before paying', () => {
        mocks.quote = { data: undefined, error: new ApiError(400, { errorCode: 3035 }) };
        const { result } = renderHook(() => useDraftActivationCheckout('event-1', { quoteEnabled: true, startAt: START }));

        expect(result.current.startPassed).toBe(true);
        expect(result.current.error).toBe('api-3035');
    });

    it('does not flag other checkout errors', async () => {
        mocks.checkout.mockRejectedValue(new ApiError(409, { errorCode: 5017 }));
        const { result } = renderHook(() => useDraftActivationCheckout('event-1', { quoteEnabled: false, startAt: START }));

        await act(() => result.current.submit());
        expect(result.current.startPassed).toBe(false);
        expect(result.current.error).toBe('api-5017');
    });

    it('says whether the payment page is opening', async () => {
        mocks.checkout.mockResolvedValueOnce({ orderId: 'ord-1', redirectUrl: 'https://pay.test' });
        const { result } = renderHook(() => useDraftActivationCheckout('event-1', { quoteEnabled: false, startAt: START }));
        await act(async () => expect(await result.current.submit()).toBe(true));

        mocks.checkout.mockRejectedValueOnce(new ApiError(409, { errorCode: 5017 }));
        await act(async () => expect(await result.current.submit()).toBe(false));
    });

    it("exposes any failed quote for screens that show only the quote's total", () => {
        mocks.quote = { data: undefined, error: new ApiError(409, { errorCode: 5017 }) };
        const { result } = renderHook(() => useDraftActivationCheckout('event-1', { quoteEnabled: true, startAt: START }));

        expect(result.current.quoteError).not.toBeNull();
        expect(result.current.error).toBeNull();
    });
});
