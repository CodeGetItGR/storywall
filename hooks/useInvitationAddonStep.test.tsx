import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationAddonCheckout } from '@/hooks/useInvitationAddonStep';
import { ApiError } from '@/lib/api/client';
import type { PaidServiceResponseDto } from '@/lib/api/types';
import type { InvitationAddonStep } from '@/lib/invitation/addonStep';

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

const saveMyDate = unlock('SMD', 'save_my_date', 2900);
const rsvp = unlock('RSVP', 'rsvp', 900);

const mocks = vi.hoisted(() => ({
    invalidate: vi.fn(),
    checkout: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    draftSubmit: vi.fn(),
    navigate: vi.fn(),
    quote: vi.fn(),
    quoteData: undefined as unknown,
    draftBreakdown: null as unknown,
    draftOptions: vi.fn(),
}));

const consent = {
    consentSatisfied: true,
    termsVersion: 'v1',
    requestsImmediateStart: true,
    acknowledgesWithdrawalTerms: true,
    handleCheckoutError: () => false,
};

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: vi.fn() }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({ useWithdrawalConsent: () => consent }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('@/hooks/useEventModules', () => ({ eventModuleKeys: { list: (id: string) => ['events', id, 'modules'] }, useEventModules: vi.fn() }));
vi.mock('@/hooks/useBilling', () => ({
    billingKeys: { event: (id: string) => ['events', id, 'billing'] },
    useEventBilling: vi.fn(),
    useAddonCheckout: () => ({ mutateAsync: mocks.checkout, isPending: false, reset: vi.fn() }),
    useAddEventAddon: () => ({ mutateAsync: mocks.add }),
    useRemoveEventAddon: () => ({ mutateAsync: mocks.remove }),
    useEventQuote: (...args: unknown[]) => {
        mocks.quote(...args);
        return { data: mocks.quoteData };
    },
}));
vi.mock('@/hooks/useDraftActivationCheckout', () => ({
    useDraftActivationCheckout: (...args: unknown[]) => {
        mocks.draftOptions(...args);
        return {
            consent,
            partnerBranding: { satisfied: true },
            breakdown: mocks.draftBreakdown,
            submit: mocks.draftSubmit,
            error: null,
            isPending: false,
        };
    },
}));
vi.mock('@/lib/billing', () => ({ navigateToCheckout: mocks.navigate }));

const RETURN_TO = '/save-my-date/editor/draft-1?publish=1';
const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

function liveStep(): InvitationAddonStep {
    return { mode: 'checkout', saveMyDate: { service: saveMyDate, added: false }, rsvp: { service: rsvp, added: false } };
}

function draftStep(rsvpAdded = false): InvitationAddonStep {
    return { mode: 'draft', saveMyDate: { service: saveMyDate, added: false }, rsvp: { service: rsvp, added: rsvpAdded } };
}

function render(step: InvitationAddonStep) {
    return renderHook(() => useInvitationAddonCheckout({ eventId: 'evt-1', draftId: 'draft-1', step }));
}

describe('useInvitationAddonCheckout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.quoteData = undefined;
        mocks.draftBreakdown = null;
    });

    it('pays for Save my date alone on a live event, and comes back to publish', async () => {
        mocks.checkout.mockResolvedValue({ orderId: 'ord-1', redirectUrl: 'https://pay.test' });
        const { result } = render(liveStep());

        expect(result.current.rsvpTicked).toBe(false);
        expect(result.current.totalMinor).toBe(2900);
        expect(mocks.quote).toHaveBeenLastCalledWith('evt-1', { kind: 'MODULE_UNLOCK', paidServiceCodes: ['SMD'] }, true);

        await act(async () => result.current.submit(submitEvent));
        expect(mocks.checkout).toHaveBeenCalledWith({
            paidServiceCodes: ['SMD'],
            requestsImmediateStart: true,
            acknowledgesWithdrawalTerms: true,
            termsVersion: 'v1',
        });
        expect(mocks.navigate).toHaveBeenCalledWith('evt-1', expect.objectContaining({ orderId: 'ord-1' }), undefined, RETURN_TO);
    });

    it('adds RSVP to the payment once ticked', () => {
        mocks.quoteData = { totalMinor: 3500, currency: 'EUR' };
        const { result } = render(liveStep());

        act(() => result.current.handleRsvpChange({ currentTarget: { checked: true } } as never));
        expect(mocks.quote).toHaveBeenLastCalledWith('evt-1', { kind: 'MODULE_UNLOCK', paidServiceCodes: ['SMD', 'RSVP'] }, true);
        expect(result.current.totalMinor).toBe(3500);
    });

    it('shows a refusal and reloads the offers when they are out of date', async () => {
        mocks.checkout.mockRejectedValue(new ApiError(409, { errorCode: 5155 }));
        const { result } = render(liveStep());

        await act(async () => result.current.submit(submitEvent));
        expect(result.current.error).toBe('api-5155');
        expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'evt-1', 'billing'] });
        expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'evt-1', 'modules'] });
        expect(mocks.navigate).not.toHaveBeenCalled();
    });

    it("opts a draft into Save my date, then runs the plan's payment back to the editor", async () => {
        const { result } = render(draftStep());

        await act(async () => result.current.submit(submitEvent));
        expect(mocks.add).toHaveBeenCalledWith({ paidServiceCode: 'SMD' });
        expect(mocks.remove).not.toHaveBeenCalled();
        expect(mocks.draftSubmit).toHaveBeenCalled();
        expect(mocks.draftOptions).toHaveBeenCalledWith('evt-1', { quoteEnabled: true, startAt: null, returnTo: RETURN_TO });
        expect(mocks.quote).toHaveBeenLastCalledWith('evt-1', null, false);
    });

    it('counts an add-on the draft already has as added', async () => {
        mocks.add.mockRejectedValue(new ApiError(409, { errorCode: 5038 }));
        const { result } = render(draftStep());

        await act(async () => result.current.submit(submitEvent));
        expect(result.current.error).toBeNull();
        expect(mocks.draftSubmit).toHaveBeenCalled();
    });

    it("starts with a draft's earlier RSVP ticked, and takes it out when unticked", async () => {
        mocks.draftBreakdown = { totalMinor: 10_000, currency: 'EUR' };
        const { result } = render(draftStep(true));

        expect(result.current.rsvpTicked).toBe(true);
        expect(result.current.totalMinor).toBe(12_900);

        act(() => result.current.handleRsvpChange({ currentTarget: { checked: false } } as never));
        expect(result.current.totalMinor).toBe(12_000);

        await act(async () => result.current.submit(submitEvent));
        expect(mocks.add).toHaveBeenCalledWith({ paidServiceCode: 'SMD' });
        expect(mocks.remove).toHaveBeenCalledWith('RSVP');
    });

    it("stops before paying when a draft's change is refused", async () => {
        mocks.add.mockRejectedValue(new ApiError(409, { errorCode: 5036 }));
        const { result } = render(draftStep());

        await act(async () => result.current.submit(submitEvent));
        expect(result.current.error).toBe('api-5036');
        expect(mocks.draftSubmit).not.toHaveBeenCalled();
        expect(mocks.invalidate).toHaveBeenCalled();
    });
});
