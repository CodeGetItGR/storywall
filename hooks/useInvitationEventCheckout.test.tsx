import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationEventCheckout } from '@/hooks/useInvitationEventCheckout';
import { ApiError } from '@/lib/api/client';
import type { PaidServiceResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';
import { sampleInvitationPlan } from '@/lib/invitation/samplePlan';
import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';

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
const platformModules = ['posts', 'rsvp', 'save_my_date'].map(
    (moduleKey, sortOrder) =>
        ({ id: moduleKey, moduleKey, name: moduleKey, description: null, isEnabled: true, sortOrder }) as PlatformModuleResponseDto,
);
const full = sampleInvitationPlan();
const small = sampleInvitationPlan({ id: 'plan-small', code: 'SMALL', moduleKeys: ['posts'] });

const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    navigate: vi.fn(),
    paidServices: [] as unknown[],
    plans: [] as unknown[],
    plansLoading: false,
}));

const consent = {
    consentSatisfied: true,
    termsVersion: 'v1',
    requestsImmediateStart: true,
    acknowledgesWithdrawalTerms: true,
    handleCheckoutError: () => false,
};

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useWithdrawalConsent', () => ({ useWithdrawalConsent: () => consent }));
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({ data: { paidServices: mocks.paidServices, modules: platformModules, media: null }, isLoading: false }),
}));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({ usePlanTiersForEventType: () => ({ data: mocks.plans, isLoading: mocks.plansLoading }) }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: mocks.post, put: mocks.put, patch: mocks.patch, del: mocks.del },
}));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: mocks.navigate,
}));

const withoutRsvp: InvitationDocument = {
    ...SAMPLE_DOCUMENT,
    sections: SAMPLE_DOCUMENT.sections.map((section) => (section.type === 'rsvp' ? { ...section, visible: false } : section)),
};

function renderCheckout(document: InvitationDocument = SAMPLE_DOCUMENT) {
    const hook = renderHook(() => useInvitationEventCheckout({ draftId: 'draft-1', eventType: 'WEDDING', document, enabled: true }));
    act(() => {
        hook.result.current.onTitleChange({ target: { value: 'Maria & Nikos' } } as ChangeEvent<HTMLInputElement>);
        hook.result.current.onStartAtChange('2099-06-01T18:00');
    });
    return hook;
}

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as SubmitEvent<HTMLFormElement>;

async function submit(hook: ReturnType<typeof renderCheckout>) {
    await act(async () => {
        await hook.result.current.submit(submitEvent());
    });
}

function tickRsvp(hook: ReturnType<typeof renderCheckout>, checked: boolean) {
    act(() => hook.result.current.handleRsvpChange({ currentTarget: { checked } } as ChangeEvent<HTMLInputElement>));
}

const addonPosts = () => mocks.post.mock.calls.filter(([path]) => String(path).endsWith('/addons'));

describe('useInvitationEventCheckout add-ons', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.paidServices = [saveMyDate, rsvp];
        mocks.plans = [full, small];
        mocks.plansLoading = false;
        mocks.post.mockImplementation(async (path: string) => (path === '/api/events' ? { id: 'evt-1' } : { url: 'https://pay' }));
        mocks.put.mockResolvedValue({ eventId: 'evt-1' });
        mocks.del.mockResolvedValue(undefined);
    });

    it('offers only plans with the invitation when no add-on is sold', () => {
        mocks.paidServices = [];
        const { result } = renderCheckout();

        expect(result.current.plans.map((plan) => plan.code)).toEqual(['PREMIUM']);
        expect(result.current.planAddons).toEqual({});
    });

    it('offers a plan that sells the invitation, with its add-on line', () => {
        const { result } = renderCheckout();

        expect(result.current.plans.map((plan) => plan.code)).toEqual(['PREMIUM', 'SMALL']);
        expect(result.current.planAddons).toEqual({ SMALL: saveMyDate });
    });

    it('offers RSVP on the chosen plan only when the invitation asks for replies and the plan lacks it', () => {
        const { result } = renderCheckout();
        expect(result.current.rsvpAddon).toBeNull();

        act(() => result.current.selectPlan('SMALL'));
        expect(result.current.rsvpAddon).toEqual(rsvp);

        const hidden = renderCheckout(withoutRsvp);
        act(() => hidden.result.current.selectPlan('SMALL'));
        expect(hidden.result.current.rsvpAddon).toBeNull();
    });

    it('offers RSVP on a plan that has the invitation but not RSVP', () => {
        mocks.plans = [full, sampleInvitationPlan({ id: 'plan-mid', code: 'MID', moduleKeys: ['posts', 'save_my_date'] })];
        const { result } = renderCheckout();
        act(() => result.current.selectPlan('MID'));

        expect(result.current.planAddons).toEqual({});
        expect(result.current.rsvpAddon).toEqual(rsvp);
    });

    it('opts into the add-ons after making the event and before the checkout', async () => {
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        tickRsvp(hook, true);
        await submit(hook);

        expect(addonPosts().map(([, body]) => body)).toEqual([{ paidServiceCode: 'SMD' }, { paidServiceCode: 'RSVP' }]);
        const paths = mocks.post.mock.calls.map(([path]) => path);
        expect(paths).toEqual(['/api/events', '/api/events/evt-1/addons', '/api/events/evt-1/addons', '/api/events/evt-1/checkout']);
        expect(mocks.navigate).toHaveBeenCalled();
    });

    it('adds nothing on a plan that has the invitation, with RSVP left unticked', async () => {
        const hook = renderCheckout();
        await submit(hook);

        expect(addonPosts()).toEqual([]);
        expect(mocks.navigate).toHaveBeenCalled();
    });

    it('counts an add-on already on the event as added', async () => {
        mocks.post.mockImplementation(async (path: string) => {
            if (path === '/api/events') return { id: 'evt-1' };
            if (path.endsWith('/addons')) throw new ApiError(409, { errorCode: 5038 });
            return { url: 'https://pay' };
        });
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        await submit(hook);

        expect(hook.result.current.error).toBeNull();
        expect(mocks.navigate).toHaveBeenCalled();
    });

    it('on a retry, adds only what is new and takes out an RSVP the host unticked', async () => {
        let checkoutFails = true;
        mocks.post.mockImplementation(async (path: string) => {
            if (path === '/api/events') return { id: 'evt-1' };
            if (path.endsWith('/checkout') && checkoutFails) throw new ApiError(500, { errorCode: 1 });
            return { url: 'https://pay' };
        });
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        tickRsvp(hook, true);
        await submit(hook);
        expect(hook.result.current.error).toBe('api-1');

        checkoutFails = false;
        mocks.post.mockClear();
        tickRsvp(hook, false);
        await submit(hook);

        expect(addonPosts()).toEqual([]);
        expect(mocks.del).toHaveBeenCalledWith('/api/events/evt-1/addons/RSVP');
        expect(mocks.post.mock.calls.map(([path]) => path)).toEqual(['/api/events/evt-1/checkout']);
    });

    it('stops before the checkout when an opt-in is refused', async () => {
        mocks.post.mockImplementation(async (path: string) => {
            if (path === '/api/events') return { id: 'evt-1' };
            if (path.endsWith('/addons')) throw new ApiError(409, { errorCode: 5036 });
            return { url: 'https://pay' };
        });
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        await submit(hook);

        expect(hook.result.current.error).toBe('api-5036');
        expect(mocks.post.mock.calls.map(([path]) => path)).not.toContain('/api/events/evt-1/checkout');
    });
    it('puts the draft on the event before opting in, so a refused opt-in leaves it attached', async () => {
        mocks.post.mockImplementation(async (path: string) => {
            if (path === '/api/events') return { id: 'evt-1' };
            if (path.endsWith('/addons')) throw new ApiError(409, { errorCode: 5036 });
            return { url: 'https://pay' };
        });
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        await submit(hook);

        expect(mocks.put).toHaveBeenCalledWith('/api/invitation-drafts/draft-1/event', { eventId: 'evt-1' });
        const [addonCall] = addonPosts();
        const addonOrder = mocks.post.mock.invocationCallOrder[mocks.post.mock.calls.indexOf(addonCall)];
        expect(mocks.put.mock.invocationCallOrder[0]).toBeLessThan(addonOrder);
    });

    it('on a retry after a refused opt-in, keeps the event and adds only what is still missing', async () => {
        let rsvpRefused = true;
        mocks.post.mockImplementation(async (path: string, body?: { paidServiceCode?: string }) => {
            if (path === '/api/events') return { id: 'evt-1' };
            if (path.endsWith('/addons') && body?.paidServiceCode === 'RSVP' && rsvpRefused) throw new ApiError(503, { errorCode: 1 });
            return { url: 'https://pay' };
        });
        const hook = renderCheckout();
        act(() => hook.result.current.selectPlan('SMALL'));
        tickRsvp(hook, true);
        await submit(hook);
        expect(hook.result.current.error).toBe('api-1');
        expect(hook.result.current.plans.map((plan) => plan.code)).toEqual(['SMALL']);

        rsvpRefused = false;
        mocks.post.mockClear();
        await submit(hook);

        expect(addonPosts().map(([, body]) => body)).toEqual([{ paidServiceCode: 'RSVP' }]);
        expect(mocks.post.mock.calls.map(([path]) => path)).toEqual(['/api/events/evt-1/addons', '/api/events/evt-1/checkout']);
        expect(mocks.navigate).toHaveBeenCalled();
    });

    it('makes one event when Continue is tapped twice', async () => {
        const hook = renderCheckout();
        await act(async () => {
            await Promise.all([hook.result.current.submit(submitEvent()), hook.result.current.submit(submitEvent())]);
        });

        expect(mocks.post.mock.calls.filter(([path]) => path === '/api/events')).toHaveLength(1);
        expect(mocks.navigate).toHaveBeenCalledOnce();
    });

    it('lets the host pay again after Back from the payment page restores the page', async () => {
        const hook = renderCheckout();
        await submit(hook);
        expect(hook.result.current.isPending).toBe(true);

        act(() => {
            const restored = new Event('pageshow');
            Object.defineProperty(restored, 'persisted', { value: true });
            window.dispatchEvent(restored);
        });
        expect(hook.result.current.isPending).toBe(false);
        expect(hook.result.current.canSubmit).toBe(true);

        mocks.post.mockClear();
        await submit(hook);
        // The made event stays: only the checkout runs again.
        expect(mocks.post.mock.calls.map(([path]) => path)).toEqual(['/api/events/evt-1/checkout']);
    });

    it('totals the chosen length and the add-ons picked', () => {
        const hook = renderCheckout();
        expect(hook.result.current.total).toEqual({ amountMinor: 4900, currency: 'EUR' });

        act(() => hook.result.current.selectPlan('SMALL'));
        expect(hook.result.current.total).toEqual({ amountMinor: 4900 + 2900, currency: 'EUR' });

        tickRsvp(hook, true);
        expect(hook.result.current.total).toEqual({ amountMinor: 4900 + 2900 + 900, currency: 'EUR' });
    });
    it('shows no total while the plans load', () => {
        mocks.plansLoading = true;
        const { result } = renderCheckout();

        expect(result.current.isLoadingPlans).toBe(true);
        expect(result.current.total).toBeNull();
    });
});
