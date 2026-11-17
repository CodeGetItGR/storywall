import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeatureAddons } from '@/hooks/useFeatureAddons';
import { ApiError } from '@/lib/api/client';
import type { EventAddonDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';

function unlock(code: string, moduleKey: string, priceAmountMinor: number): PaidServiceResponseDto {
    return {
        id: `svc-${code}`,
        code,
        kind: 'MODULE_UNLOCK',
        name: code,
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: moduleKey,
        planTierIds: [],
    };
}

const mocks = vi.hoisted(() => ({
    params: new URLSearchParams(),
    checkout: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    navigate: vi.fn(),
    quote: vi.fn(),
    quoteData: undefined as unknown,
    paused: false,
    purchaseBlock: null as string | null,
    staleHandled: false,
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        data: {
            paidServices: [unlock('SMD', 'save_my_date', 2900), unlock('RSVP', 'rsvp', 900)],
            modules: ['posts', 'rsvp', 'save_my_date'].map((moduleKey, sortOrder) => ({ moduleKey, isEnabled: true, sortOrder })),
        },
    }),
}));
vi.mock('@/hooks/useEventModules', () => ({
    useEventModules: () => ({ data: [{ moduleKey: 'posts', isEnabled: true }], isLoading: false }),
}));
vi.mock('@/hooks/useBilling', () => ({
    useAddonCheckout: () => ({ mutateAsync: mocks.checkout, isPending: false, reset: vi.fn() }),
    useAddEventAddon: () => ({ mutateAsync: mocks.add }),
    useRemoveEventAddon: () => ({ mutateAsync: mocks.remove }),
    useEventQuote: (...args: unknown[]) => {
        mocks.quote(...args);
        return { data: mocks.quoteData };
    },
}));
vi.mock('@/hooks/useBillingWithdrawals', () => ({ useStoragePurchasePaused: () => mocks.paused }));
vi.mock('@/hooks/usePurchaseBlock', () => ({ usePurchaseBlock: () => mocks.purchaseBlock }));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: vi.fn() }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useWithdrawalConsent', () => ({
    useWithdrawalConsent: () => ({
        consentSatisfied: true,
        termsVersion: 'v1',
        requestsImmediateStart: true,
        acknowledgesWithdrawalTerms: true,
        handleCheckoutError: () => mocks.staleHandled,
    }),
}));
vi.mock('@/lib/billing', () => ({ navigateToCheckout: mocks.navigate }));

const plan = { id: 'plan-lite', code: 'LITE', moduleKeys: ['posts'], priceCurrency: 'EUR' } as unknown as PlanTierResponseDto;

function render(eventStatus: EventStatus = 'ACTIVE', ownedAddons: EventAddonDto[] = []) {
    return renderHook(() => useFeatureAddons({ eventId: 'evt-1', eventStatus, plan, ownedAddons }));
}

describe('useFeatureAddons', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.params = new URLSearchParams();
        mocks.quoteData = undefined;
        mocks.paused = false;
        mocks.purchaseBlock = null;
        mocks.staleHandled = false;
    });

    it('ticks the add-on named in the link and totals it', () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        const { result } = render();

        expect(result.current.mode).toBe('checkout');
        expect(result.current.selectedCodes.has('SMD')).toBe(true);
        expect(result.current.totalMinor).toBe(2900);
        expect(result.current.canPay).toBe(true);
        expect(mocks.quote).toHaveBeenLastCalledWith('evt-1', { kind: 'MODULE_UNLOCK', paidServiceCodes: ['SMD'] }, true);
    });

    it("prefers the server's total once it answers", () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        mocks.quoteData = { totalMinor: 2500, currency: 'EUR' };

        expect(render().result.current.totalMinor).toBe(2500);
    });

    it('pays for every ticked add-on in one checkout', async () => {
        mocks.checkout.mockResolvedValue({ orderId: 'ord-1', redirectUrl: 'https://pay.test', buyerType: 'CONSUMER' });
        const { result } = render();

        act(() => result.current.toggle('RSVP'));
        act(() => result.current.toggle('SMD'));
        await act(() => result.current.pay());

        expect(mocks.checkout).toHaveBeenCalledWith({
            paidServiceCodes: ['RSVP', 'SMD'],
            requestsImmediateStart: true,
            acknowledgesWithdrawalTerms: true,
            termsVersion: 'v1',
        });
        expect(mocks.navigate).toHaveBeenCalledWith('evt-1', expect.objectContaining({ orderId: 'ord-1' }));
    });

    it('unticks an add-on on a second tap', () => {
        const { result } = render();

        act(() => result.current.toggle('RSVP'));
        act(() => result.current.toggle('RSVP'));
        expect(result.current.pickedCount).toBe(0);
        expect(result.current.canPay).toBe(false);
    });

    it('shows the refusal when checkout fails', async () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        mocks.checkout.mockRejectedValue(new ApiError(409, { errorCode: 5155 }));
        const { result } = render();

        await act(() => result.current.pay());
        expect(result.current.error).toBe('api-5155');
        expect(mocks.navigate).not.toHaveBeenCalled();
    });

    it('leaves stale terms to the consent box', async () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        mocks.staleHandled = true;
        mocks.checkout.mockRejectedValue(new ApiError(409, { errorCode: 5072 }));
        const { result } = render();

        await act(() => result.current.pay());
        expect(result.current.error).toBeNull();
    });

    it('cannot pay while a withdrawal is under review', async () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        mocks.paused = true;
        const { result } = render();

        expect(result.current.paused).toBe(true);
        expect(result.current.canPay).toBe(false);
        await act(() => result.current.pay());
        expect(mocks.checkout).not.toHaveBeenCalled();
    });

    it('cannot pay for a co-host', async () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        mocks.purchaseBlock = 'primaryHostOnly';
        const { result } = render();

        expect(result.current.canPay).toBe(false);
        await act(() => result.current.pay());
        expect(mocks.checkout).not.toHaveBeenCalled();
    });

    it("adds and removes a draft's add-ons", async () => {
        const owned: EventAddonDto = { code: 'RSVP', name: 'RSVP', priceAmountMinor: 900, billingPeriod: 'ONE_TIME', activatedAt: '' };
        const { result } = render('DRAFT', [owned]);

        expect(result.current.mode).toBe('draft');
        expect(result.current.offers.map((offer) => [offer.service.code, offer.added])).toEqual([
            ['RSVP', true],
            ['SMD', false],
        ]);

        await act(() => result.current.setDraftAddon('SMD', true));
        expect(mocks.add).toHaveBeenCalledWith({ paidServiceCode: 'SMD' });

        await act(() => result.current.setDraftAddon('RSVP', false));
        expect(mocks.remove).toHaveBeenCalledWith('RSVP');
        expect(result.current.pendingCode).toBeNull();
    });

    it("shows a draft change's refusal", async () => {
        mocks.add.mockRejectedValue(new ApiError(409, { errorCode: 5031 }));
        const { result } = render('DRAFT');

        await act(() => result.current.setDraftAddon('SMD', true));
        expect(result.current.error).toBe('api-5031');
    });

    it('never asks for a quote on a draft', () => {
        mocks.params = new URLSearchParams({ add: 'SMD' });
        render('DRAFT');

        expect(mocks.quote).toHaveBeenLastCalledWith('evt-1', null, true);
    });
});
